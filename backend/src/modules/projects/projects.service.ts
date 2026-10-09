import { prisma } from "../../lib/prisma";
import { AppError, conflict, forbidden, notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";
import { Access, can } from "../../middleware/access";
import { audit } from "../../services/audit";

function toDate(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return new Date(v);
}

export async function createProject(access: Access, actorId: string, input: Record<string, string>) {
  if (access.kind !== "MEMBER") throw forbidden("Insufficient permission");
  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client || client.workspaceId !== access.workspaceId) {
    throw new AppError("VALIDATION_ERROR", "Client must belong to the workspace");
  }
  const project = await prisma.project.create({
    data: {
      workspaceId: access.workspaceId, clientId: input.clientId, name: input.name,
      description: input.description, projectType: (input.projectType ?? "CUSTOM") as never,
      projectTypeLabel: input.projectTypeLabel,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
    },
  });
  await audit({ workspaceId: access.workspaceId, projectId: project.id, actorId, action: "project.created", entityType: "Project", entityId: project.id });
  return project;
}

export async function listProjects(access: Access, q: { status?: string; clientId?: string; search?: string; page: number; limit: number }) {
  if (access.kind === "CLIENT") {
    const projects = await prisma.project.findMany({
      where: { clientId: access.clientId },
      include: { client: { select: { id: true, name: true, company: true } } },
      orderBy: { createdAt: "desc" },
    });
    return paged(projects, projects.length, 1, projects.length || 1);
  }
  const search = q.search?.trim();
  let memberProjectIds: string[] | undefined;
  if (access.role === "TEAM_MEMBER") {
    const pm = await prisma.projectMember.findMany({ where: { userId: access.userId }, select: { projectId: true } });
    memberProjectIds = pm.map((p) => p.projectId);
  }
  const where = {
    workspaceId: access.workspaceId,
    ...(q.status ? { status: q.status as never } : {}),
    ...(q.clientId ? { clientId: q.clientId } : {}),
    ...(memberProjectIds ? { id: { in: memberProjectIds } } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };
  const { page, limit, skip, take } = paginate(q);
  const [total, data] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: { client: { select: { id: true, name: true, company: true } } } }),
  ]);
  return paged(data, total, page, limit);
}

export async function getProject(access: Access, id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      scope: { include: { versions: { orderBy: { version: "desc" }, take: 5 } } },
    },
  });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  if (access.kind === "CLIENT" && project.clientId !== access.clientId) throw notFound("Project not found");
  return project;
}

export async function patchProject(access: Access, actorId: string, id: string, data: Record<string, string | null>) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing || existing.workspaceId !== access.workspaceId) throw notFound("Project not found");
  if (data.status === "COMPLETED" && existing.status !== "COMPLETED") {
    const [openTasks, pendingCRs] = await Promise.all([
      prisma.task.count({ where: { projectId: id, status: { not: "COMPLETED" } } }),
      prisma.changeRequest.count({ where: { projectId: id, status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
    ]);
    if (openTasks > 0 || pendingCRs > 0) {
      throw conflict(`Cannot complete: ${openTasks} open task(s) and ${pendingCRs} pending change request(s) remain`);
    }
  }
  const { status, projectType, ...rest } = data;
  const project = await prisma.project.update({
    where: { id },
    data: {
      ...rest,
      ...(status ? { status: status as never } : {}),
      ...(projectType ? { projectType: projectType as never } : {}),
      ...(data.startDate !== undefined ? { startDate: toDate(data.startDate as string | null) } : {}),
      ...(data.deadline !== undefined ? { deadline: toDate(data.deadline as string | null) } : {}),
    },
  });
  await audit({ workspaceId: access.workspaceId, projectId: id, actorId, action: "project.updated", entityType: "Project", entityId: id, metadata: { changed: Object.keys(data) } });
  return project;
}

export async function deleteProject(access: Access, actorId: string, id: string) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing || existing.workspaceId !== access.workspaceId) throw notFound("Project not found");
  await prisma.project.delete({ where: { id } });
  await audit({ workspaceId: access.workspaceId, actorId, action: "project.deleted", entityType: "Project", entityId: id });
  return { ok: true };
}

export async function listProjectMembers(access: Access, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  return prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function addProjectMember(access: Access, actorId: string, projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!membership) throw new AppError("VALIDATION_ERROR", "User must be a workspace member first");
  const pm = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {},
    create: { projectId, userId },
  });
  await audit({ workspaceId: access.workspaceId, projectId, actorId, action: "project.member_added", entityType: "ProjectMember", entityId: pm.id, metadata: { userId } });
  return pm;
}

export async function removeProjectMember(access: Access, actorId: string, projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  await prisma.projectMember.deleteMany({ where: { projectId, userId } });
  await audit({ workspaceId: access.workspaceId, projectId, actorId, action: "project.member_removed", entityType: "ProjectMember", entityId: `${projectId}:${userId}` });
  return { ok: true };
}

export function assertCan(access: Access, perm: Parameters<typeof can>[1]) {
  if (!can(access, perm)) throw forbidden("Insufficient permission");
}
