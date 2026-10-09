import { prisma } from "../../lib/prisma";
import { AppError, conflict, notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";
import { Access } from "../../middleware/access";
import { audit } from "../../services/audit";
import { notify } from "../../services/notify";

type Question = { id: string; question: string; answerType: string; options?: string[]; required?: boolean };

export async function createIR(access: Access, actorId: string, input: { projectId: string; type?: "INITIAL" | "CLARIFICATION"; title: string; description?: string; questions: Question[]; deadline?: string }) {
  const row = await prisma.informationRequest.create({
    data: {
      projectId: input.projectId, createdById: actorId,
      type: (input.type ?? "INITIAL") as never, title: input.title, description: input.description,
      questions: input.questions as object, deadline: input.deadline ? new Date(input.deadline) : undefined,
    },
  });
  await audit({ workspaceId: access.workspaceId, projectId: input.projectId, actorId, action: "ir.created", entityType: "InformationRequest", entityId: row.id });
  return row;
}

export async function listIRs(access: Access, projectId: string, q: { status?: string; page: number; limit: number }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  let where: Record<string, unknown> = { projectId };
  if (q.status) where = { ...where, status: q.status };
  if (access.kind === "CLIENT") {
    // Clients read SENT/ANSWERED ones on own projects only.
    if (project.clientId !== access.clientId) throw notFound("Project not found");
    where = { projectId, status: { in: q.status ? [q.status] : ["SENT", "ANSWERED"] } };
  }
  const { page, limit, skip, take } = paginate(q);
  const [total, data] = await Promise.all([
    prisma.informationRequest.count({ where: where as never }),
    prisma.informationRequest.findMany({ where: where as never, skip, take, orderBy: { createdAt: "desc" } }),
  ]);
  return paged(data, total, page, limit);
}

export async function getIR(access: Access, id: string) {
  const row = await prisma.informationRequest.findUnique({ where: { id }, include: { project: { select: { id: true, workspaceId: true, clientId: true } } } });
  if (!row || row.project.workspaceId !== access.workspaceId) throw notFound("Information request not found");
  if (access.kind === "CLIENT") {
    if (row.project.clientId !== access.clientId) throw notFound("Information request not found");
    if (row.status !== "SENT" && row.status !== "ANSWERED") throw notFound("Information request not found");
  }
  return row;
}

export async function patchIR(access: Access, actorId: string, id: string, data: Record<string, unknown>) {
  const existing = await prisma.informationRequest.findUnique({ where: { id } });
  if (!existing) throw notFound("Information request not found");
  const project = await prisma.project.findUnique({ where: { id: existing.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Information request not found");
  if (existing.status !== "DRAFT") throw conflict("Only DRAFT requests can be edited");
  const row = await prisma.informationRequest.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title as string } : {}),
      ...(data.description !== undefined ? { description: data.description as string | null } : {}),
      ...(data.questions !== undefined ? { questions: data.questions as object } : {}),
      ...(data.deadline !== undefined ? { deadline: data.deadline ? new Date(data.deadline as string) : null } : {}),
      ...(data.status !== undefined ? { status: data.status as never } : {}),
    },
  });
  await audit({ workspaceId: access.workspaceId, projectId: existing.projectId, actorId, action: "ir.updated", entityType: "InformationRequest", entityId: id });
  return row;
}

/** DRAFT → SENT: notifies the client in-app + email. */
export async function sendIR(access: Access, actorId: string, id: string) {
  const existing = await prisma.informationRequest.findUnique({ where: { id }, include: { project: { select: { id: true, name: true, clientId: true } } } });
  if (!existing) throw notFound("Information request not found");
  const project = await prisma.project.findUnique({ where: { id: existing.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Information request not found");
  if (existing.status !== "DRAFT") throw conflict("Only DRAFT requests can be sent");
  const row = await prisma.informationRequest.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date(), lastReminderAt: new Date(), reminderCount: 0 },
  });
  const client = await prisma.client.findUnique({ where: { id: project.clientId } });
  await notify("ir.sent", {
    projectId: project.id, clientId: project.clientId,
    title: "New information request",
    body: `${existing.title} — ${project.name}`,
    link: `/portal/projects/${project.id}/requests/${id}`,
    entityType: "InformationRequest", entityId: id,
    email: client ? { template: "ir-sent", data: { title: existing.title, projectId: project.id, requestId: id, deadline: existing.deadline?.toISOString() ?? "" } } : undefined,
  });
  await audit({ workspaceId: access.workspaceId, projectId: project.id, actorId, action: "ir.sent", entityType: "InformationRequest", entityId: id });
  return row;
}

/** Clarification loop: prefilled CLARIFICATION request + mark requirements NEEDS_CLARIFICATION. */
export async function requestClarification(access: Access, actorId: string, input: { projectId: string; requirementIds: string[]; questions: Question[]; deadline?: string }) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  const reqs = await prisma.requirement.findMany({ where: { id: { in: input.requirementIds }, projectId: input.projectId } });
  if (reqs.length !== input.requirementIds.length) throw new AppError("VALIDATION_ERROR", "Some requirements were not found in this project");
  const ir = await prisma.$transaction(async (tx) => {
    const created = await tx.informationRequest.create({
      data: {
        projectId: input.projectId, createdById: actorId, type: "CLARIFICATION",
        title: `Clarification needed (${reqs.length} requirement${reqs.length > 1 ? "s" : ""})`,
        description: reqs.map((r) => `${r.code}: ${r.title}`).join("\n"),
        questions: input.questions as object,
        deadline: input.deadline ? new Date(input.deadline) : undefined,
        status: "SENT", sentAt: new Date(), lastReminderAt: new Date(), reminderCount: 0,
      },
    });
    await tx.requirement.updateMany({
      where: { id: { in: input.requirementIds } },
      data: { status: "NEEDS_CLARIFICATION", clarificationRequestId: created.id },
    });
    return created;
  });
  await notify("ir.sent", {
    projectId: project.id, clientId: project.clientId,
    title: "Clarification requested",
    body: `${reqs.length} requirement(s) need clarification`,
    link: `/portal/projects/${project.id}/requests/${ir.id}`,
    entityType: "InformationRequest", entityId: ir.id,
  });
  await audit({ workspaceId: access.workspaceId, projectId: project.id, actorId, action: "requirement.clarification_requested", entityType: "InformationRequest", entityId: ir.id, metadata: { requirementIds: input.requirementIds } });
  return ir;
}
