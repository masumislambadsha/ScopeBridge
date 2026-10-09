import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { AppError, conflict, forbidden, notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";
import { Access } from "../../middleware/access";
import { audit } from "../../services/audit";
import { notify } from "../../services/notify";
import { approvalDTO } from "../../core/dto";

export function contentHashOf(content: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

function versionContent(v: { features: unknown; deliverables: unknown; exclusions: unknown; priority: unknown; deadline: unknown }) {
  return { features: v.features, deliverables: v.deliverables, exclusions: v.exclusions, priority: v.priority, deadline: v.deadline };
}

async function scopedApproval(access: Access, id: string) {
  const a = await prisma.approval.findUnique({
    where: { id },
    include: {
      scopeVersion: true,
      scope: { select: { id: true, project: { select: { id: true, name: true, workspaceId: true, clientId: true } } } },
      client: { select: { id: true, name: true, portalUserId: true } },
    },
  });
  if (!a || a.scope.project.workspaceId !== access.workspaceId) throw notFound("Approval not found");
  if (access.kind === "CLIENT" && a.clientId !== access.clientId) throw notFound("Approval not found");
  return a;
}

/** §7.1 path: send the scope's open DRAFT (or an explicit version) for approval. */
export async function requestApprovalForScope(access: Access, actorId: string, scopeId: string, scopeVersionId?: string) {
  if (!scopeVersionId) {
    const open = await prisma.scopeVersion.findFirst({
      where: { scopeId, status: "DRAFT" },
      orderBy: { version: "desc" },
    });
    if (!open) throw conflict("This scope has no open DRAFT version to send for approval");
    scopeVersionId = open.id;
  }
  return requestApproval(access, actorId, scopeVersionId);
}

/** PM sends a version for approval: freezes it as PENDING_APPROVAL + contentHash. */
export async function requestApproval(access: Access, actorId: string, scopeVersionId: string) {
  const v = await prisma.scopeVersion.findUnique({ where: { id: scopeVersionId }, include: { scope: { include: { project: true } } } });
  if (!v || v.scope.project.workspaceId !== access.workspaceId) throw notFound("Scope version not found");
  if (v.status !== "DRAFT") throw conflict(`Only DRAFT versions can be sent for approval (current: ${v.status})`);
  const pending = await prisma.approval.findFirst({ where: { scopeVersionId, status: "PENDING" } });
  if (pending) throw conflict("This version already has a pending approval");
  const hash = contentHashOf(versionContent(v as never));
  const approval = await prisma.$transaction(async (tx) => {
    await tx.scopeVersion.update({ where: { id: v.id }, data: { status: "PENDING_APPROVAL", submittedAt: new Date() } });
    return tx.approval.create({
      data: {
        scopeId: v.scopeId, scopeVersionId: v.id, clientId: v.scope.project.clientId,
        requestedById: actorId, status: "PENDING", contentHash: hash,
      },
    });
  });
  await notify("approval.requested", {
    projectId: v.scope.projectId, clientId: v.scope.project.clientId,
    title: "Scope approval requested",
    body: `Version v${v.version} of ${v.scope.project.name} needs your review`,
    link: `/portal/projects/${v.scope.projectId}/scope`,
    entityType: "Approval", entityId: approval.id,
    email: { template: "approval-requested", data: { version: String(v.version), projectName: v.scope.project.name, projectId: v.scope.projectId } },
  });
  await audit({ workspaceId: access.workspaceId, projectId: v.scope.projectId, actorId, action: "scope.sent_for_approval", entityType: "Approval", entityId: approval.id, metadata: { version: v.version } });
  return approval;
}

export async function listApprovals(userId: string, q: { scopeId?: string; scopeVersionId?: string; status?: string; page: number; limit: number }) {
  const memberships = await prisma.workspaceMember.findMany({ where: { userId }, select: { workspaceId: true } });
  const wsIds = memberships.map((m) => m.workspaceId);
  const portalClients = await prisma.client.findMany({ where: { portalUserId: userId }, select: { id: true } });
  const clientIds = portalClients.map((c) => c.id);
  const base: Record<string, unknown> = {
    ...(q.scopeId ? { scopeId: q.scopeId } : {}),
    ...(q.scopeVersionId ? { scopeVersionId: q.scopeVersionId } : {}),
    ...(q.status ? { status: q.status } : {}),
  };
  const accessFilter = {
    OR: [
      { scope: { project: { workspaceId: { in: wsIds.length ? wsIds : ["__none__"] } } } },
      ...(clientIds.length ? [{ clientId: { in: clientIds } }] : []),
    ],
  };
  const isClientOnly = !wsIds.length && clientIds.length > 0;
  const { page, limit, skip, take } = paginate(q);
  const [total, data] = await Promise.all([
    prisma.approval.count({ where: { ...base, ...accessFilter } as never }),
    prisma.approval.findMany({
      where: { ...base, ...accessFilter } as never, skip, take, orderBy: { createdAt: "desc" },
      include: { scopeVersion: { select: { id: true, version: true, status: true } }, client: { select: { id: true, name: true } } },
    }),
  ]);
  return paged(isClientOnly ? data.map((a) => approvalDTO(a as unknown as Record<string, unknown>)) : data, total, page, limit);
}

export async function getApproval(access: Access, id: string) {
  const a = await scopedApproval(access, id);
  if (access.kind === "CLIENT") return approvalDTO(a as unknown as Record<string, unknown>);
  return a;
}

interface Decision {
  comment?: string;
  signatureName: string;
  ip?: string;
  userAgent?: string;
}

function assertDecidable(access: Access, a: Awaited<ReturnType<typeof scopedApproval>>) {
  if (a.status !== "PENDING") throw conflict(`Approval already decided (${a.status})`);
  if (access.kind !== "CLIENT" || access.clientId !== a.clientId) {
    throw forbidden("Only the addressed client can decide this approval");
  }
  // Integrity: recompute hash over the frozen content.
  const current = contentHashOf(versionContent(a.scopeVersion as never));
  if (a.contentHash && current !== a.contentHash) {
    throw conflict("Scope content changed after the approval was requested; ask the agency for a fresh approval");
  }
}

export async function approve(access: Access, actorId: string, id: string, d: Decision) {
  const a = await scopedApproval(access, id);
  assertDecidable(access, a);
  const version = a.scopeVersion;
  const out = await prisma.$transaction(async (tx) => {
    const approval = await tx.approval.update({
      where: { id }, data: { status: "APPROVED", decidedById: actorId, decidedAt: new Date(), comment: d.comment ?? null, signatureName: d.signatureName, ipAddress: d.ip ?? null, userAgent: d.userAgent ?? null },
    });
    await tx.scopeVersion.update({ where: { id: version.id }, data: { status: "APPROVED", approvedAt: new Date() } });
    // Previous approved version becomes SUPERSEDED (kept as history).
    const prev = await tx.scopeVersion.findFirst({ where: { scopeId: a.scopeId, status: "APPROVED", id: { not: version.id } } });
    if (prev) await tx.scopeVersion.update({ where: { id: prev.id }, data: { status: "SUPERSEDED" } });
    await tx.scope.update({ where: { id: a.scopeId }, data: { approvedVersionId: version.id } });
    // Included requirements become APPROVED.
    const links = await tx.scopeVersionRequirement.findMany({ where: { scopeVersionId: version.id }, select: { requirementId: true } });
    if (links.length) {
      await tx.requirement.updateMany({ where: { id: { in: links.map((l) => l.requirementId) } }, data: { status: "APPROVED", approvedById: actorId, approvedAt: new Date() } });
    }
    // Linked CRs (FR-25): every CR proposed in this version becomes APPROVED.
    await tx.changeRequest.updateMany({
      where: { proposedScopeVersionId: version.id, status: { in: ["PENDING", "UNDER_REVIEW"] } },
      data: { status: "APPROVED", clientApprovalStatus: "APPROVED", resultingScopeVersionId: version.id, decidedAt: new Date() },
    });
    return approval;
  });
  const project = a.scope.project;
  await notify("approval.decided", {
    projectId: project.id, clientId: a.clientId,
    title: "Scope approved", body: `Version v${version.version} of ${project.name} was approved`,
    link: `/projects/${project.id}`, entityType: "Approval", entityId: id,
    email: { template: "scope-decided", data: { version: String(version.version), decision: "approved", comment: d.comment ?? "" } },
  });
  await audit({ workspaceId: access.workspaceId, projectId: project.id, actorId, action: "scope.version.approved", entityType: "ScopeVersion", entityId: version.id, metadata: { version: version.version, signatureName: d.signatureName } });
  return out;
}

export async function reject(access: Access, actorId: string, id: string, d: Decision) {
  const a = await scopedApproval(access, id);
  assertDecidable(access, a);
  if (!d.comment?.trim()) throw new AppError("VALIDATION_ERROR", "A comment is required to reject");
  const out = await prisma.$transaction(async (tx) => {
    const approval = await tx.approval.update({
      where: { id }, data: { status: "REJECTED", decidedById: actorId, decidedAt: new Date(), comment: d.comment, signatureName: d.signatureName, ipAddress: d.ip ?? null, userAgent: d.userAgent ?? null },
    });
    await tx.scopeVersion.update({ where: { id: a.scopeVersionId }, data: { status: "REJECTED" } });
    // FR-25: linked CRs become REJECTED.
    await tx.changeRequest.updateMany({
      where: { proposedScopeVersionId: a.scopeVersionId, status: { in: ["PENDING", "UNDER_REVIEW"] } },
      data: { status: "REJECTED", clientApprovalStatus: "REJECTED", decidedAt: new Date() },
    });
    return approval;
  });
  const project = a.scope.project;
  await notify("approval.decided", {
    projectId: project.id, clientId: a.clientId,
    title: "Scope rejected", body: `Version v${a.scopeVersion.version} was rejected: ${d.comment}`,
    link: `/projects/${project.id}`, entityType: "Approval", entityId: id,
    email: { template: "scope-decided", data: { version: String(a.scopeVersion.version), decision: "rejected", comment: d.comment ?? "" } },
  });
  await audit({ workspaceId: access.workspaceId, projectId: project.id, actorId, action: "scope.version.rejected", entityType: "ScopeVersion", entityId: a.scopeVersionId });
  return out;
}

export async function requestChanges(access: Access, actorId: string, id: string, d: Decision) {
  const a = await scopedApproval(access, id);
  assertDecidable(access, a);
  if (!d.comment?.trim()) throw new AppError("VALIDATION_ERROR", "A comment is required to request changes");
  const out = await prisma.$transaction(async (tx) => {
    const approval = await tx.approval.update({
      where: { id }, data: { status: "CHANGES_REQUESTED", decidedById: actorId, decidedAt: new Date(), comment: d.comment, signatureName: d.signatureName, ipAddress: d.ip ?? null, userAgent: d.userAgent ?? null },
    });
    await tx.scopeVersion.update({ where: { id: a.scopeVersionId }, data: { status: "CHANGES_REQUESTED" } });
    return approval;
  });
  const project = a.scope.project;
  await notify("approval.decided", {
    projectId: project.id, clientId: a.clientId,
    title: "Scope changes requested", body: `Version v${a.scopeVersion.version}: ${d.comment}`,
    link: `/projects/${project.id}`, entityType: "Approval", entityId: id,
    email: { template: "scope-decided", data: { version: String(a.scopeVersion.version), decision: "changes requested", comment: d.comment ?? "" } },
  });
  await audit({ workspaceId: access.workspaceId, projectId: project.id, actorId, action: "scope.version.changes_requested", entityType: "ScopeVersion", entityId: a.scopeVersionId });
  return out;
}
