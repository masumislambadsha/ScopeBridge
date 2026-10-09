import { prisma } from "../../lib/prisma";
import { AppError, conflict, forbidden, notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";
import { Access } from "../../middleware/access";
import { audit } from "../../services/audit";
import { notify } from "../../services/notify";
import { assertMagic } from "../../middleware/upload";
import { uploadFile, deleteFile } from "../../services/storage";
import { filesQueue } from "../../queues/queues";
import { withFeatureIds } from "../scopes/scopes.service";
import { emitTeam } from "../../services/realtime";
import { changeRequestDTO } from "../../core/dto";

function pad(n: number) {
  return String(n).padStart(3, "0");
}

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/** Client/PM submits a CR. baseScopeVersionId auto-set; 409 when no approved scope exists. */
export async function createCR(
  access: Access,
  actorId: string,
  input: { projectId: string; title: string; description: string },
  files: UploadedFile[],
) {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    include: { scope: { include: { versions: { where: { status: "APPROVED" }, orderBy: { version: "desc" }, take: 1 } } } },
  });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  if (access.kind === "CLIENT" && project.clientId !== access.clientId) throw notFound("Project not found");
  const base = project.scope?.versions[0] ?? null;
  if (!base) {
    throw conflict("Use an information request before the first scope approval.");
  }
  const clientId = access.kind === "CLIENT" ? access.clientId : project.clientId;

  const uploaded: Array<UploadedFile & { key: string; url: string | null }> = [];
  try {
    for (const f of files) {
      assertMagic(f.buffer, f.mimetype, f.originalname);
      const stored = await uploadFile(f.buffer, {
        originalName: f.originalname, mimeType: f.mimetype, size: f.size,
        projectId: input.projectId, folder: "scopebridge/change-requests",
      });
      uploaded.push({ ...f, ...stored });
    }
  } catch (err) {
    for (const u of uploaded) await deleteFile(u.key);
    throw err;
  }

  try {
    const cr = await prisma.$transaction(async (tx) => {
      const p = await tx.project.update({ where: { id: input.projectId }, data: { crSeq: { increment: 1 } } });
      const created = await tx.changeRequest.create({
        data: {
          projectId: input.projectId, code: `CR-${pad(p.crSeq)}`, clientId,
          requestedById: actorId, baseScopeVersionId: base.id,
          title: input.title, description: input.description,
          status: "PENDING", clientApprovalStatus: "PENDING",
        },
      });
      for (const u of uploaded) {
        await tx.file.create({
          data: {
            projectId: input.projectId, changeRequestId: created.id, uploadedById: actorId,
            originalName: u.originalname, mimeType: u.mimetype, size: u.size,
            storageKey: u.key, url: u.url,
          },
        });
      }
      return created;
    });
    const fileRows = await prisma.file.findMany({ where: { changeRequestId: cr.id }, select: { id: true } });
    for (const f of fileRows) await filesQueue.add("extract", { fileId: f.id });

    await notify("cr.submitted", {
      projectId: input.projectId, title: `New change request ${cr.code}`,
      body: input.title, link: `/projects/${input.projectId}`,
      entityType: "ChangeRequest", entityId: cr.id, excludeUserId: actorId,
    });
    await audit({ workspaceId: access.workspaceId, projectId: input.projectId, actorId, action: "cr.submitted", entityType: "ChangeRequest", entityId: cr.id, metadata: { code: cr.code } });

    const { queueScopeAnalysis } = await import("../ai/ai.service");
    await queueScopeAnalysis(cr.id, input.projectId, actorId).catch(() => undefined);
    return cr;
  } catch (err) {
    for (const u of uploaded) await deleteFile(u.key);
    throw err;
  }
}

export async function listCRs(access: Access, projectId: string, q: { status?: string; page: number; limit: number }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  if (access.kind === "CLIENT" && project.clientId !== access.clientId) throw notFound("Project not found");
  const where = { projectId, ...(q.status ? { status: q.status as never } : {}) };
  const { page, limit, skip, take } = paginate(q);
  const [total, data] = await Promise.all([
    prisma.changeRequest.count({ where }),
    prisma.changeRequest.findMany({
      where, skip, take, orderBy: { createdAt: "desc" },
      include: { requestedBy: { select: { id: true, name: true } } },
    }),
  ]);
  if (access.kind === "CLIENT") return paged(data.map((c) => changeRequestDTO(c as unknown as Record<string, unknown>)), total, page, limit);
  return paged(data, total, page, limit);
}

export async function getCR(access: Access, id: string) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      files: { select: { id: true, originalName: true, mimeType: true, size: true, extractionStatus: true, createdAt: true } },
      requestedBy: { select: { id: true, name: true } },
      baseScopeVersion: { select: { id: true, version: true, status: true } },
      proposedScopeVersion: { select: { id: true, version: true, status: true } },
      resultingScopeVersion: { select: { id: true, version: true, status: true } },
      tasks: { select: { id: true, code: true, title: true, status: true } },
    },
  });
  if (!cr) throw notFound("Change request not found");
  const project = await prisma.project.findUnique({ where: { id: cr.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Change request not found");
  if (access.kind === "CLIENT") {
    if (project.clientId !== access.clientId) throw notFound("Change request not found");
    return changeRequestDTO(cr as unknown as Record<string, unknown>);
  }
  return cr;
}

async function scopedCR(access: Access, id: string) {
  const cr = await prisma.changeRequest.findUnique({ where: { id } });
  if (!cr) throw notFound("Change request not found");
  const project = await prisma.project.findUnique({ where: { id: cr.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Change request not found");
  return { cr, project };
}

/** PATCH: PM moves PENDING → UNDER_REVIEW and records estimates. */
export async function patchCR(access: Access, actorId: string, id: string, data: Record<string, unknown>) {
  const { cr, project } = await scopedCR(access, id);
  if (data.status && data.status !== "UNDER_REVIEW") {
    throw new AppError("VALIDATION_ERROR", "Use the approve/reject endpoints to decide a change request");
  }
  if (cr.status !== "PENDING" && data.status === "UNDER_REVIEW") {
    throw conflict(`Change request is already ${cr.status}`);
  }
  const row = await prisma.changeRequest.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title as string } : {}),
      ...(data.description !== undefined ? { description: data.description as string } : {}),
      ...(data.status ? { status: "UNDER_REVIEW" as never, reviewedById: actorId } : {}),
      ...(data.estimatedHours !== undefined ? { estimatedHours: data.estimatedHours as number | null } : {}),
      ...(data.estimatedCost !== undefined ? { estimatedCost: data.estimatedCost as number | null } : {}),
      ...(data.timelineImpactDays !== undefined ? { timelineImpactDays: data.timelineImpactDays as number | null } : {}),
      ...(data.pmNote !== undefined ? { pmNote: data.pmNote as string | null } : {}),
    },
  });
  await audit({ workspaceId: access.workspaceId, projectId: project.id, actorId, action: "cr.review_started", entityType: "ChangeRequest", entityId: id });
  return row;
}

export async function analyzeCR(access: Access, actorId: string, id: string) {
  const { cr, project } = await scopedCR(access, id);
  const { queueScopeAnalysis } = await import("../ai/ai.service");
  const run = await queueScopeAnalysis(cr.id, project.id, actorId);
  return { aiRunId: run.id };
}

/** PM approves: IN_SCOPE path closes the CR; otherwise a v(n+1) DRAFT is created/proposed. */
export async function approveCR(access: Access, actorId: string, id: string, input: {
  finalClassification: "IN_SCOPE" | "OUT_OF_SCOPE" | "POSSIBLY_RELATED";
  createScopeVersion: boolean;
  estimatedHours?: number; estimatedCost?: number; timelineImpactDays?: number; note?: string;
  newFeatures?: Array<{ title: string; description: string; priority: string; requirementIds: string[]; acceptanceCriteria: Array<{ given: string; when: string; then: string }> }>;
}) {
  const { cr, project } = await scopedCR(access, id);
  if (cr.status !== "PENDING" && cr.status !== "UNDER_REVIEW") {
    throw conflict(`Change request is already ${cr.status}`);
  }
  if (!input.createScopeVersion) {
    // Typical IN_SCOPE: no scope change needed; tasks may now reference the CR.
    const approvedVersion = await prisma.scopeVersion.findFirst({
      where: { scope: { projectId: project.id }, status: "APPROVED" },
      orderBy: { version: "desc" },
    });
    const row = await prisma.changeRequest.update({
      where: { id },
      data: {
        status: "APPROVED", clientApprovalStatus: "NOT_REQUIRED",
        finalClassification: input.finalClassification,
        estimatedHours: input.estimatedHours ?? null,
        estimatedCost: input.estimatedCost ?? null,
        timelineImpactDays: input.timelineImpactDays ?? null,
        pmNote: input.note ?? null, reviewedById: actorId, decidedById: actorId, decidedAt: new Date(),
        resultingScopeVersionId: approvedVersion?.id ?? null,
      },
    });
    await afterDecision(access.workspaceId, project.id, actorId, row.id, "APPROVED", input.note);
    return row;
  }
  // createScopeVersion=true: create (or reuse) the open DRAFT v(n+1).
  const scope = await prisma.scope.findUnique({ where: { projectId: project.id }, include: { versions: { orderBy: { version: "desc" } } } });
  if (!scope) throw new AppError("VALIDATION_ERROR", "Project has no scope yet");
  const approved = scope.versions.find((v) => v.status === "APPROVED");
  if (!approved) throw conflict("No approved scope version to base v(n+1) on");
  let draft = scope.versions.find((v) => v.status === "DRAFT" || v.status === "PENDING_APPROVAL") ?? null;
  const out = await prisma.$transaction(async (tx) => {
    if (!draft) {
      const next = Math.max(...scope.versions.map((v) => v.version)) + 1;
      draft = await tx.scopeVersion.create({
        data: {
          scopeId: scope.id, version: next, status: "DRAFT",
          features: (approved.features ?? []) as object,
          deliverables: (approved.deliverables ?? []) as object,
          exclusions: (approved.exclusions ?? []) as object,
          priority: approved.priority, deadline: approved.deadline,
          basedOnVersionId: approved.id, createdById: actorId,
        },
      });
    }
    // Append new features (each carrying changeRequestId) + create CHANGE_REQUEST requirements.
    const features = [...((draft.features ?? []) as Array<Record<string, unknown>>)];
    const createdReqIds: string[] = [];
    for (const f of input.newFeatures ?? []) {
      const req = await tx.requirement.create({
        data: {
          projectId: project.id,
          code: `REQ-${String((await tx.project.update({ where: { id: project.id }, data: { requirementSeq: { increment: 1 } } })).requirementSeq).padStart(3, "0")}`,
          title: f.title, description: f.description, priority: f.priority as never,
          status: "DRAFT", source: "CHANGE_REQUEST", changeRequestId: id, createdById: actorId,
        },
      });
      createdReqIds.push(req.id);
      features.push({ ...(withFeatureIds([{ ...f, requirementIds: [...f.requirementIds, req.id] }])[0]), changeRequestId: id });
    }
    const updated = await tx.scopeVersion.update({ where: { id: draft.id }, data: { features: features as object } });
    await tx.scopeVersionRequirement.deleteMany({ where: { scopeVersionId: draft.id } });
    const allReqIds = [...new Set(features.flatMap((f) => (f.requirementIds ?? []) as string[]))];
    const valid = allReqIds.length
      ? await tx.requirement.findMany({ where: { id: { in: allReqIds }, projectId: project.id }, select: { id: true } })
      : [];
    if (valid.length) {
      await tx.scopeVersionRequirement.createMany({ data: valid.map((r) => ({ scopeVersionId: draft!.id, requirementId: r.id })), skipDuplicates: true });
    }
    const row = await tx.changeRequest.update({
      where: { id },
      data: {
        status: "UNDER_REVIEW", clientApprovalStatus: "PENDING",
        finalClassification: input.finalClassification,
        estimatedHours: input.estimatedHours ?? null,
        estimatedCost: input.estimatedCost ?? null,
        timelineImpactDays: input.timelineImpactDays ?? null,
        pmNote: input.note ?? null, reviewedById: actorId,
        proposedScopeVersionId: draft.id,
      },
    });
    return { row, version: updated, createdReqIds };
  });
  await audit({ workspaceId: access.workspaceId, projectId: project.id, actorId, action: "cr.version_proposed", entityType: "ChangeRequest", entityId: id, metadata: { version: out.version.version } });
  await emitTeam(project.id, "scope:version:updated", { projectId: project.id, scopeVersionId: out.version.id });
  return out.row;
}

export async function rejectCR(access: Access, actorId: string, id: string, reason: string) {
  const { cr, project } = await scopedCR(access, id);
  if (cr.status !== "PENDING" && cr.status !== "UNDER_REVIEW") {
    throw conflict(`Change request is already ${cr.status}`);
  }
  const row = await prisma.changeRequest.update({
    where: { id },
    data: { status: "REJECTED", clientApprovalStatus: "REJECTED", pmNote: reason, decidedById: actorId, decidedAt: new Date() },
  });
  await afterDecision(access.workspaceId, project.id, actorId, row.id, "REJECTED", reason);
  return row;
}

async function afterDecision(workspaceId: string, projectId: string, actorId: string, crId: string, decision: "APPROVED" | "REJECTED", note?: string | null) {
  const cr = await prisma.changeRequest.findUnique({ where: { id: crId } });
  await notify("cr.decided", {
    projectId, clientId: cr?.clientId,
    title: `Change request ${decision.toLowerCase()}`,
    body: `${cr?.code} — ${cr?.title}`,
    link: `/projects/${projectId}`,
    entityType: "ChangeRequest", entityId: crId, excludeUserId: actorId,
    email: cr ? { template: "cr-decided", data: { code: cr.code, title: cr.title, decision: decision.toLowerCase(), note: note ?? "" } } : undefined,
  });
  await audit({ workspaceId, projectId, actorId, action: `cr.${decision.toLowerCase()}`, entityType: "ChangeRequest", entityId: crId });
}

/** IMPLEMENTED when every linked task is COMPLETED (at least one), or manually by PM. */
export async function maybeMarkImplemented(workspaceId: string, changeRequestId: string | null, actorId: string) {
  if (!changeRequestId) return;
  const cr = await prisma.changeRequest.findUnique({
    where: { id: changeRequestId },
    include: { tasks: { select: { status: true } } },
  });
  if (!cr || cr.status !== "APPROVED") return;
  if (cr.tasks.length > 0 && cr.tasks.every((t) => t.status === "COMPLETED")) {
    await prisma.changeRequest.update({ where: { id: cr.id }, data: { status: "IMPLEMENTED", implementedAt: new Date() } });
    await audit({ workspaceId, projectId: cr.projectId, actorId, action: "cr.implemented", entityType: "ChangeRequest", entityId: cr.id, actorType: "SYSTEM" });
  }
}

export async function markImplemented(access: Access, actorId: string, id: string) {
  const { cr, project } = await scopedCR(access, id);
  if (access.kind !== "MEMBER") throw forbidden("Insufficient permission");
  if (cr.status !== "APPROVED") throw conflict(`Only APPROVED change requests can be marked implemented (current: ${cr.status})`);
  const row = await prisma.changeRequest.update({ where: { id }, data: { status: "IMPLEMENTED", implementedAt: new Date() } });
  await audit({ workspaceId: access.workspaceId, projectId: project.id, actorId, action: "cr.implemented", entityType: "ChangeRequest", entityId: id });
  return row;
}
