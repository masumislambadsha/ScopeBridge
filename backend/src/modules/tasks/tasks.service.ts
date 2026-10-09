import { prisma } from "../../lib/prisma";
import { AppError, conflict, forbidden, notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";
import { Access } from "../../middleware/access";
import { audit } from "../../services/audit";
import { notify } from "../../services/notify";
import { Feature } from "../scopes/scopes.service";

function pad(n: number) {
  return String(n).padStart(3, "0");
}

/** Firewall: version must exist, belong to the project, and be APPROVED. */
export async function assertApprovedVersion(projectId: string, scopeVersionId: string) {
  const v = await prisma.scopeVersion.findUnique({
    where: { id: scopeVersionId },
    include: { scope: { select: { projectId: true } } },
  });
  if (!v || v.scope.projectId !== projectId) throw new AppError("VALIDATION_ERROR", "Scope version does not belong to this project");
  if (v.status !== "APPROVED") {
    throw conflict("Tasks require an APPROVED scope version (this is the Change Request Firewall)");
  }
  return v;
}

/** Firewall: a task linked to a CR requires the CR to be APPROVED. */
async function assertCRApprovable(projectId: string, changeRequestId: string) {
  const cr = await prisma.changeRequest.findUnique({ where: { id: changeRequestId } });
  if (!cr || cr.projectId !== projectId) throw new AppError("VALIDATION_ERROR", "Change request does not belong to this project");
  if (cr.status !== "APPROVED") {
    throw conflict(`Tasks cannot reference change request ${cr.code} while it is ${cr.status} (firewall: CR must be APPROVED)`);
  }
  return cr;
}

async function assertAssigneeInWorkspace(workspaceId: string, assigneeId: string) {
  const m = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: assigneeId } } });
  if (!m) throw new AppError("VALIDATION_ERROR", "Assignee must be a workspace member");
}

export async function createTask(access: Access, actorId: string, input: Record<string, unknown>) {
  const projectId = input.projectId as string;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  await assertApprovedVersion(projectId, input.scopeVersionId as string);
  if (input.changeRequestId) await assertCRApprovable(projectId, input.changeRequestId as string);
  if (input.requirementId) {
    const r = await prisma.requirement.findUnique({ where: { id: input.requirementId as string }, select: { projectId: true } });
    if (!r || r.projectId !== projectId) throw new AppError("VALIDATION_ERROR", "Requirement does not belong to this project");
  }
  if (input.assigneeId) await assertAssigneeInWorkspace(access.workspaceId, input.assigneeId as string);
  const task = await prisma.$transaction(async (tx) => {
    const p = await tx.project.update({ where: { id: projectId }, data: { taskSeq: { increment: 1 } } });
    return tx.task.create({
      data: {
        projectId, code: `TASK-${pad(p.taskSeq)}`,
        title: input.title as string, description: (input.description as string) ?? null,
        requirementId: (input.requirementId as string) ?? null,
        scopeVersionId: input.scopeVersionId as string,
        changeRequestId: (input.changeRequestId as string) ?? null,
        assigneeId: (input.assigneeId as string) ?? null,
        createdById: actorId,
        priority: ((input.priority as string) ?? "MEDIUM") as never,
        deadline: input.deadline ? new Date(input.deadline as string) : undefined,
      },
    });
  });
  await audit({ workspaceId: access.workspaceId, projectId, actorId, action: "task.created", entityType: "Task", entityId: task.id, metadata: { code: task.code } });
  if (task.assigneeId) {
    await notify("task.assigned", { projectId, title: `New task assigned: ${task.title}`, link: `/tasks`, entityType: "Task", entityId: task.id });
  }
  return task;
}

export async function listTasks(access: Access, q: { projectId?: string; status?: string; assigneeId?: string; priority?: string; page: number; limit: number }) {
  const where: Record<string, unknown> = {
    ...(q.projectId ? { projectId: q.projectId } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.assigneeId ? { assigneeId: q.assigneeId } : {}),
    ...(q.priority ? { priority: q.priority } : {}),
  };
  if (access.kind === "CLIENT") throw forbidden("Clients see progress only (see portal project)");
  if (q.projectId) {
    const project = await prisma.project.findUnique({ where: { id: q.projectId } });
    if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  } else {
    // No projectId: scope to the requester's workspaces (never cross-workspace, §2.2 D03).
    const memberships = await prisma.workspaceMember.findMany({ where: { userId: access.userId }, select: { workspaceId: true } });
    Object.assign(where, { project: { workspaceId: { in: memberships.map((m) => m.workspaceId) } } });
    if (access.role === "TEAM_MEMBER") Object.assign(where, { assigneeId: access.userId });
  }
  const { page, limit, skip, take } = paginate(q);
  const [total, data] = await Promise.all([
    prisma.task.count({ where: where as never }),
    prisma.task.findMany({
      where: where as never, skip, take, orderBy: { createdAt: "desc" },
      include: { assignee: { select: { id: true, name: true } }, requirement: { select: { id: true, code: true, title: true } } },
    }),
  ]);
  return paged(data, total, page, limit);
}

export async function myTasks(access: Access, q: { page: number; limit: number }) {
  if (access.kind !== "MEMBER") throw forbidden("Insufficient permission");
  return listTasks(access, { ...q, assigneeId: access.userId, status: undefined, priority: undefined, projectId: undefined });
}

export async function getTask(access: Access, id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true } },
      requirement: { select: { id: true, code: true, title: true } },
      scopeVersion: { select: { id: true, version: true, status: true } },
      changeRequest: { select: { id: true, code: true, title: true, status: true } },
    },
  });
  if (!task) throw notFound("Task not found");
  const project = await prisma.project.findUnique({ where: { id: task.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Task not found");
  return task;
}

const TEAM_CEILING: Record<string, number> = { TODO: 0, IN_PROGRESS: 1, REVIEW: 2, COMPLETED: 3 };

export async function patchTask(access: Access, actorId: string, id: string, data: Record<string, unknown>) {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw notFound("Task not found");
  const project = await prisma.project.findUnique({ where: { id: existing.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Task not found");

  if (access.kind === "MEMBER" && access.role === "TEAM_MEMBER") {
    if (existing.assigneeId !== access.userId) throw forbidden("You can only update your own assigned tasks");
    if (data.status && TEAM_CEILING[data.status as string] > TEAM_CEILING.REVIEW) {
      throw forbidden("Team members can move tasks up to REVIEW; a PM completes them");
    }
    const guarded = ["title", "description", "assigneeId", "priority", "deadline", "requirementId", "scopeVersionId", "changeRequestId"];
    if (guarded.some((k) => data[k] !== undefined)) throw forbidden("Team members can only change task status");
  }

  const before = { status: existing.status, assigneeId: existing.assigneeId };
  const row = await prisma.task.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title as string } : {}),
      ...(data.description !== undefined ? { description: (data.description as string) ?? null } : {}),
      ...(data.priority !== undefined ? { priority: data.priority as never } : {}),
      ...(data.status !== undefined ? { status: data.status as never, ...(data.status === "COMPLETED" ? { completedAt: new Date() } : {}) } : {}),
      ...(data.assigneeId !== undefined ? { assigneeId: (data.assigneeId as string) ?? null } : {}),
      ...(data.deadline !== undefined ? { deadline: data.deadline ? new Date(data.deadline as string) : null } : {}),
    },
  });
  if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
    await notify("task.assigned", { projectId: existing.projectId, title: `Task assigned: ${row.title}`, link: `/tasks`, entityType: "Task", entityId: id });
  }
  await audit({ workspaceId: access.workspaceId, projectId: existing.projectId, actorId, action: "task.status_changed", entityType: "Task", entityId: id, metadata: { before, after: { status: row.status, assigneeId: row.assigneeId } } });
  if (row.status === "COMPLETED") {
    const { maybeMarkImplemented } = await import("../change-requests/change-requests.service");
    await maybeMarkImplemented(access.workspaceId, row.changeRequestId, actorId).catch(() => undefined);
  }
  return row;
}

export async function deleteTask(access: Access, actorId: string, id: string) {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw notFound("Task not found");
  const project = await prisma.project.findUnique({ where: { id: existing.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Task not found");
  await prisma.task.delete({ where: { id } });
  await audit({ workspaceId: access.workspaceId, projectId: existing.projectId, actorId, action: "task.deleted", entityType: "Task", entityId: id });
  return { ok: true };
}

export interface TaskPreview {
  title: string;
  description: string;
  requirementId?: string;
  changeRequestId?: string;
  priority: string;
  featureId: string;
}

/** Preview only — writes nothing. One proposed task per feature (acceptance criteria included). */
export async function generateTasksPreview(access: Access, versionId: string, onlyNew: boolean): Promise<{ version: { id: string; version: number }; preview: TaskPreview[] }> {
  const v = await prisma.scopeVersion.findUnique({ where: { id: versionId }, include: { scope: { select: { projectId: true, project: { select: { workspaceId: true } } } } } });
  if (!v || v.scope.project.workspaceId !== access.workspaceId) throw notFound("Scope version not found");
  if (v.status !== "APPROVED") throw conflict("Tasks can only be generated from an APPROVED scope version");
  const features = (v.features ?? []) as Feature[];
  let included = features;
  if (onlyNew) {
    const prev = await prisma.scopeVersion.findFirst({
      where: { scopeId: v.scopeId, status: { in: ["APPROVED", "SUPERSEDED"] }, version: { lt: v.version } },
      orderBy: { version: "desc" },
    });
    const prevIds = new Set((((prev?.features ?? []) as Feature[]).map((f) => f.id)));
    included = features.filter((f) => !prevIds.has(f.id));
  }
  const existingReqIds = new Set(
    (await prisma.task.findMany({ where: { scopeVersionId: v.id }, select: { requirementId: true, changeRequestId: true } }))
      .flatMap((t) => [t.requirementId, t.changeRequestId].filter(Boolean) as string[]),
  );
  const preview: TaskPreview[] = [];
  for (const f of included) {
    const key = f.requirementIds[0] ?? f.changeRequestId ?? f.id;
    if (existingReqIds.has(key)) continue;
    const criteria = (f.acceptanceCriteria ?? []).map((c) => `Given ${c.given}, when ${c.when}, then ${c.then}`).join("\n");
    preview.push({
      title: f.title,
      description: [f.description, criteria ? `Acceptance criteria:\n${criteria}` : ""].filter(Boolean).join("\n\n"),
      ...(f.requirementIds[0] ? { requirementId: f.requirementIds[0] } : {}),
      ...(f.changeRequestId ? { changeRequestId: f.changeRequestId } : {}),
      priority: f.priority ?? "MEDIUM",
      featureId: f.id,
    });
  }
  return { version: { id: v.id, version: v.version }, preview };
}

/** Confirm preview: firewall-checked bulk creation with TASK-xxx codes. */
export async function bulkCreateTasks(access: Access, actorId: string, projectId: string, input: { scopeVersionId: string; tasks: Array<Record<string, unknown>> }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  const v = await assertApprovedVersion(projectId, input.scopeVersionId);
  void v;
  const rows = await prisma.$transaction(async (tx) => {
    const out = [];
    for (const t of input.tasks) {
      if (t.changeRequestId) await assertCRApprovable(projectId, t.changeRequestId as string);
      const p = await tx.project.update({ where: { id: projectId }, data: { taskSeq: { increment: 1 } } });
      out.push(await tx.task.create({
        data: {
          projectId, code: `TASK-${pad(p.taskSeq)}`,
          title: t.title as string, description: (t.description as string) ?? null,
          requirementId: (t.requirementId as string) ?? null,
          scopeVersionId: input.scopeVersionId,
          changeRequestId: (t.changeRequestId as string) ?? null,
          assigneeId: (t.assigneeId as string) ?? null,
          createdById: actorId,
          priority: ((t.priority as string) ?? "MEDIUM") as never,
          deadline: t.deadline ? new Date(t.deadline as string) : undefined,
        },
      }));
    }
    return out;
  });
  await audit({ workspaceId: access.workspaceId, projectId, actorId, action: "task.bulk_created", entityType: "Task", metadata: { count: rows.length, scopeVersionId: input.scopeVersionId } });
  for (const t of rows) {
    if (t.assigneeId) await notify("task.assigned", { projectId, title: `New task assigned: ${t.title}`, link: `/tasks`, entityType: "Task", entityId: t.id });
  }
  return rows;
}
