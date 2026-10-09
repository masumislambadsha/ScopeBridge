import { prisma } from "../../lib/prisma";
import { AppError, conflict, forbidden, notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";
import { Access } from "../../middleware/access";
import { audit } from "../../services/audit";
import { notify } from "../../services/notify";
import { requirementDTO } from "../../core/dto";

function pad(n: number) {
  return String(n).padStart(3, "0");
}

export async function createRequirement(access: Access, actorId: string, input: Record<string, unknown>) {
  const projectId = input.projectId as string;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  const row = await prisma.$transaction(async (tx) => {
    const p = await tx.project.update({ where: { id: projectId }, data: { requirementSeq: { increment: 1 } } });
    return tx.requirement.create({
      data: {
        projectId, code: `REQ-${pad(p.requirementSeq)}`,
        title: input.title as string, description: (input.description as string) ?? null,
        category: (input.category as string) ?? "general",
        priority: ((input.priority as string) ?? "MEDIUM") as never,
        status: "DRAFT", source: ((input.source as string) ?? "MANUAL") as never,
        sourceContext: (input.sourceContext as string) ?? null,
        submissionId: (input.submissionId as string) ?? null,
        fileId: (input.fileId as string) ?? null,
        changeRequestId: (input.changeRequestId as string) ?? null,
        acceptanceCriteria: (input.acceptanceCriteria ?? []) as object,
        createdById: actorId,
      },
    });
  });
  await audit({ workspaceId: access.workspaceId, projectId, actorId, action: "requirement.created", entityType: "Requirement", entityId: row.id, metadata: { code: row.code } });
  return row;
}

export async function listRequirements(access: Access, projectId: string, q: { status?: string; source?: string; search?: string; page: number; limit: number }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  if (access.kind === "CLIENT" && project.clientId !== access.clientId) throw notFound("Project not found");
  const search = q.search?.trim();
  let where: Record<string, unknown> = {
    projectId,
    ...(q.status ? { status: q.status } : {}),
    ...(q.source ? { source: q.source } : {}),
    ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] } : {}),
  };
  if (access.kind === "CLIENT") {
    // Clients read non-draft, non-rejected requirements without AI internals.
    where = { ...where, status: q.status && q.status !== "DRAFT" && q.status !== "REJECTED" ? q.status : { in: ["READY", "APPROVED", "NEEDS_CLARIFICATION"] } };
  }
  const { page, limit, skip, take } = paginate(q);
  const [total, data] = await Promise.all([
    prisma.requirement.count({ where: where as never }),
    prisma.requirement.findMany({ where: where as never, skip, take, orderBy: { code: "asc" } }),
  ]);
  if (access.kind === "CLIENT") return paged(data.map((r) => requirementDTO(r as unknown as Record<string, unknown>)), total, page, limit);
  return paged(data, total, page, limit);
}

export async function getRequirement(access: Access, id: string) {
  const row = await prisma.requirement.findUnique({
    where: { id },
    include: {
      scopeVersionLinks: { include: { scopeVersion: { select: { id: true, version: true, status: true } } } },
      tasks: { select: { id: true, code: true, title: true, status: true } },
    },
  });
  if (!row) throw notFound("Requirement not found");
  const project = await prisma.project.findUnique({ where: { id: row.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Requirement not found");
  if (access.kind === "CLIENT") {
    if (project.clientId !== access.clientId) throw notFound("Requirement not found");
    if (row.status === "DRAFT" || row.status === "REJECTED") throw notFound("Requirement not found");
    return requirementDTO(row as unknown as Record<string, unknown>);
  }
  return row;
}

export async function patchRequirement(access: Access, actorId: string, id: string, data: Record<string, unknown>) {
  const existing = await prisma.requirement.findUnique({ where: { id } });
  if (!existing) throw notFound("Requirement not found");
  const project = await prisma.project.findUnique({ where: { id: existing.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Requirement not found");
  if (data.status === "APPROVED" || data.status === "REJECTED") {
    throw new AppError("VALIDATION_ERROR", "Use the approve endpoint to approve; PATCH cannot set APPROVED/REJECTED");
  }
  const before = { title: existing.title, status: existing.status, priority: existing.priority };
  const row = await prisma.requirement.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title as string } : {}),
      ...(data.description !== undefined ? { description: data.description as string | null } : {}),
      ...(data.category !== undefined ? { category: data.category as string } : {}),
      ...(data.priority !== undefined ? { priority: data.priority as never } : {}),
      ...(data.status !== undefined ? { status: data.status as never } : {}),
      ...(data.sourceContext !== undefined ? { sourceContext: data.sourceContext as string | null } : {}),
      ...(data.acceptanceCriteria !== undefined ? { acceptanceCriteria: data.acceptanceCriteria as object } : {}),
      ...(data.acceptanceCriteriaStatus !== undefined ? { acceptanceCriteriaStatus: data.acceptanceCriteriaStatus as never } : {}),
    },
  });
  await audit({ workspaceId: access.workspaceId, projectId: existing.projectId, actorId, action: "requirement.updated", entityType: "Requirement", entityId: id, metadata: { before, after: { title: row.title, status: row.status } } });
  await notify("requirement.updated", { projectId: existing.projectId, title: `Requirement ${row.code} updated`, link: `/projects/${existing.projectId}`, entityType: "Requirement", entityId: id, excludeUserId: actorId });
  return row;
}

/** Human-only approval (AI never writes APPROVED). READY → APPROVED. */
export async function approveRequirement(access: Access, actorId: string, id: string) {
  const existing = await prisma.requirement.findUnique({ where: { id } });
  if (!existing) throw notFound("Requirement not found");
  const project = await prisma.project.findUnique({ where: { id: existing.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Requirement not found");
  if (existing.status !== "READY" && existing.status !== "DRAFT") {
    throw conflict(`Only READY or DRAFT requirements can be approved (current: ${existing.status})`);
  }
  const row = await prisma.requirement.update({
    where: { id },
    data: { status: "APPROVED", approvedById: actorId, approvedAt: new Date() },
  });
  await audit({ workspaceId: access.workspaceId, projectId: existing.projectId, actorId, action: "requirement.approved", entityType: "Requirement", entityId: id, metadata: { code: row.code } });
  return row;
}

export async function deleteRequirement(access: Access, actorId: string, id: string) {
  const existing = await prisma.requirement.findUnique({
    where: { id },
    include: { scopeVersionLinks: { include: { scopeVersion: { select: { status: true } } } } },
  });
  if (!existing) throw notFound("Requirement not found");
  const project = await prisma.project.findUnique({ where: { id: existing.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Requirement not found");
  if (existing.scopeVersionLinks.some((l) => l.scopeVersion.status === "APPROVED")) {
    throw conflict("Requirement is included in an approved scope version and cannot be deleted (reject it instead)");
  }
  await prisma.$transaction([
    prisma.scopeVersionRequirement.deleteMany({ where: { requirementId: id } }),
    prisma.requirement.delete({ where: { id } }),
  ]);
  await audit({ workspaceId: access.workspaceId, projectId: existing.projectId, actorId, action: "requirement.deleted", entityType: "Requirement", entityId: id, metadata: { code: existing.code } });
  return { ok: true };
}

/** Latest readiness report for the project's readiness panel (null when none yet). */
export async function latestReadiness(access: Access, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  if (access.kind === "CLIENT" && project.clientId !== access.clientId) throw notFound("Project not found");
  return prisma.readinessReport.findFirst({ where: { projectId }, orderBy: { createdAt: "desc" } });
}

export async function markRequirements(access: Access, actorId: string, projectId: string, requirementIds: string[], verdict: "READY" | "NEEDS_CLARIFICATION") {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  const rows = await prisma.requirement.findMany({ where: { id: { in: requirementIds }, projectId } });
  if (rows.length !== requirementIds.length) throw new AppError("VALIDATION_ERROR", "Some requirements were not found in this project");
  if (access.kind !== "MEMBER") throw forbidden("Insufficient permission");
  await prisma.requirement.updateMany({ where: { id: { in: requirementIds } }, data: { status: verdict } });
  await audit({ workspaceId: access.workspaceId, projectId, actorId, action: "requirement.bulk_marked", entityType: "Requirement", metadata: { verdict, count: requirementIds.length } });
  return { ok: true, count: requirementIds.length, verdict };
}
