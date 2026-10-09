import { prisma } from "../../lib/prisma";
import { AppError, conflict, notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";
import { Access } from "../../middleware/access";
import { audit } from "../../services/audit";
import { scopeVersionDTO } from "../../core/dto";

export type Feature = {
  id: string; title: string; description: string; priority: string;
  requirementIds: string[]; acceptanceCriteria: Array<{ given: string; when: string; then: string }>;
  changeRequestId?: string;
};

function newFeatureId() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function withFeatureIds(features: Array<Partial<Feature>>): Feature[] {
  return features.map((f) => ({
    id: f.id ?? newFeatureId(),
    title: f.title ?? "Untitled feature",
    description: f.description ?? "",
    priority: f.priority ?? "MEDIUM",
    requirementIds: f.requirementIds ?? [],
    acceptanceCriteria: f.acceptanceCriteria ?? [],
    ...(f.changeRequestId ? { changeRequestId: f.changeRequestId } : {}),
  }));
}

export async function loadScopeByProject(projectId: string, workspaceId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== workspaceId) throw notFound("Project not found");
  return prisma.scope.findUnique({ where: { projectId } });
}

/** POST /api/scopes — one scope per project + v1 DRAFT. */
export async function createScope(access: Access, actorId: string, projectId: string, title?: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  const existing = await prisma.scope.findUnique({ where: { projectId } });
  if (existing) throw conflict("This project already has a scope");
  const scope = await prisma.$transaction(async (tx) => {
    const s = await tx.scope.create({ data: { projectId, title: title ?? "Project Scope" } });
    await tx.scopeVersion.create({
      data: { scopeId: s.id, version: 1, status: "DRAFT", features: [], deliverables: [], exclusions: [], createdById: actorId },
    });
    return s;
  });
  await audit({ workspaceId: access.workspaceId, projectId, actorId, action: "scope.created", entityType: "Scope", entityId: scope.id });
  return scope;
}

export async function listScopes(access: Access, projectId: string, q: { page: number; limit: number }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  const { page, limit, skip, take } = paginate(q);
  const where = { projectId };
  const [total, data] = await Promise.all([
    prisma.scope.count({ where }),
    prisma.scope.findMany({ where, skip, take, include: { versions: { orderBy: { version: "desc" } } } }),
  ]);
  return paged(data, total, page, limit);
}

export async function getScope(access: Access, id: string) {
  const scope = await prisma.scope.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: "desc" } }, project: { select: { workspaceId: true, clientId: true } } },
  });
  if (!scope || scope.project.workspaceId !== access.workspaceId) throw notFound("Scope not found");
  if (access.kind === "CLIENT") {
    // Clients read non-DRAFT versions only.
    return { ...scope, versions: scope.versions.filter((v) => v.status !== "DRAFT") };
  }
  return scope;
}

export async function getVersion(access: Access, id: string) {
  const v = await prisma.scopeVersion.findUnique({
    where: { id },
    include: {
      scope: { select: { id: true, project: { select: { workspaceId: true, clientId: true } } } },
      requirementLinks: { include: { requirement: { select: { id: true, code: true, title: true, status: true } } } },
      approvals: { orderBy: { createdAt: "desc" } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!v || v.scope.project.workspaceId !== access.workspaceId) throw notFound("Scope version not found");
  if (access.kind === "CLIENT") {
    if (v.scope.project.clientId !== access.clientId) throw notFound("Scope version not found");
    if (v.status === "DRAFT") throw notFound("Scope version not found");
    return scopeVersionDTO(v as unknown as Record<string, unknown>);
  }
  return v;
}

/** Only DRAFT is editable — everything else is immutable (409). */
export async function patchVersion(access: Access, actorId: string, id: string, data: Record<string, unknown>) {
  const existing = await prisma.scopeVersion.findUnique({ where: { id }, include: { scope: true } });
  if (!existing) throw notFound("Scope version not found");
  const project = await prisma.project.findUnique({ where: { id: existing.scope.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Scope version not found");
  if (existing.status !== "DRAFT") {
    throw conflict(`Only DRAFT versions are editable (current: ${existing.status})`);
  }
  const body = data as { features?: Array<Partial<Feature>>; deliverables?: string[]; exclusions?: string[]; summary?: string | null; priority?: string; deadline?: string | null };
  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.scopeVersion.update({
      where: { id },
      data: {
        ...(body.summary !== undefined ? { summary: body.summary } : {}),
        ...(body.features !== undefined ? { features: withFeatureIds(body.features) as object } : {}),
        ...(body.deliverables !== undefined ? { deliverables: body.deliverables as object } : {}),
        ...(body.exclusions !== undefined ? { exclusions: body.exclusions as object } : {}),
        ...(body.priority !== undefined ? { priority: body.priority as never } : {}),
        ...(body.deadline !== undefined ? { deadline: body.deadline ? new Date(body.deadline) : null } : {}),
      },
    });
    // Rebuild requirement links from features.
    const features = (updated.features ?? []) as Feature[];
    const reqIds = [...new Set(features.flatMap((f) => f.requirementIds ?? []))];
    const valid = reqIds.length
      ? await tx.requirement.findMany({ where: { id: { in: reqIds }, projectId: project.id }, select: { id: true } })
      : [];
    const validIds = new Set(valid.map((r) => r.id));
    await tx.scopeVersionRequirement.deleteMany({ where: { scopeVersionId: id } });
    if (validIds.size) {
      await tx.scopeVersionRequirement.createMany({
        data: [...validIds].map((requirementId) => ({ scopeVersionId: id, requirementId })),
        skipDuplicates: true,
      });
    }
    // Invalid requirement ids are dropped silently? No — fail loudly.
    const invalid = reqIds.filter((r) => !validIds.has(r));
    if (invalid.length) throw new AppError("VALIDATION_ERROR", `Unknown requirements for this project: ${invalid.slice(0, 5).join(", ")}`);
    return updated;
  });
  await audit({ workspaceId: access.workspaceId, projectId: project.id, actorId, action: "scope.version_updated", entityType: "ScopeVersion", entityId: id });
  return row;
}

async function assertNoOpenVersion(scopeId: string) {
  const open = await prisma.scopeVersion.findFirst({
    where: { scopeId, status: { in: ["DRAFT", "PENDING_APPROVAL"] } },
  });
  if (open) throw conflict(`Version v${open.version} is still open (${open.status}); close it before creating a new one`);
}

/** New DRAFT copied from the latest approved version (or basedOnVersionId). */
export async function createVersion(access: Access, actorId: string, scopeId: string, basedOnVersionId?: string) {
  const scope = await prisma.scope.findUnique({ where: { id: scopeId }, include: { versions: { orderBy: { version: "desc" } } } });
  if (!scope) throw notFound("Scope not found");
  const project = await prisma.project.findUnique({ where: { id: scope.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Scope not found");
  await assertNoOpenVersion(scopeId);
  const base = basedOnVersionId
    ? await prisma.scopeVersion.findUnique({ where: { id: basedOnVersionId } })
    : scope.versions.find((v) => v.status === "APPROVED") ?? scope.versions[0];
  if (!base || base.scopeId !== scopeId) throw new AppError("VALIDATION_ERROR", "Base version not found in this scope");
  const next = Math.max(...scope.versions.map((v) => v.version)) + 1;
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.scopeVersion.create({
      data: {
        scopeId, version: next, status: "DRAFT",
        summary: base.summary, features: (base.features ?? []) as object,
        deliverables: (base.deliverables ?? []) as object, exclusions: (base.exclusions ?? []) as object,
        priority: base.priority, deadline: base.deadline,
        basedOnVersionId: base.id, createdById: actorId,
      },
    });
    const links = await tx.scopeVersionRequirement.findMany({ where: { scopeVersionId: base.id }, select: { requirementId: true } });
    if (links.length) {
      await tx.scopeVersionRequirement.createMany({ data: links.map((l) => ({ scopeVersionId: created.id, requirementId: l.requirementId })), skipDuplicates: true });
    }
    return created;
  });
  await audit({ workspaceId: access.workspaceId, projectId: project.id, actorId, action: "scope.version_created", entityType: "ScopeVersion", entityId: row.id, metadata: { version: next, basedOn: base.version } });
  return row;
}

export async function listVersions(access: Access, scopeId: string, q: { page: number; limit: number }) {
  const scope = await prisma.scope.findUnique({ where: { id: scopeId }, include: { project: { select: { workspaceId: true, clientId: true } } } });
  if (!scope || scope.project.workspaceId !== access.workspaceId) throw notFound("Scope not found");
  const where = access.kind === "CLIENT"
    ? { scopeId, status: { not: "DRAFT" as never } }
    : { scopeId };
  const { page, limit, skip, take } = paginate(q);
  const [total, data] = await Promise.all([
    prisma.scopeVersion.count({ where }),
    prisma.scopeVersion.findMany({ where, skip, take, orderBy: { version: "desc" } }),
  ]);
  return paged(access.kind === "CLIENT" ? data.map((v) => scopeVersionDTO(v as unknown as Record<string, unknown>)) : data, total, page, limit);
}

/** Diff two versions: features added/removed/modified (by stable id) + deliverable/exclusion changes. */
export async function compareVersions(access: Access, scopeId: string, fromId: string, toId: string) {
  const [a, b] = await Promise.all([
    prisma.scopeVersion.findUnique({ where: { id: fromId } }),
    prisma.scopeVersion.findUnique({ where: { id: toId } }),
  ]);
  if (!a || !b || a.scopeId !== scopeId || b.scopeId !== scopeId) throw notFound("Scope version not found");
  const scope = await prisma.scope.findUnique({ where: { id: scopeId }, include: { project: { select: { workspaceId: true, clientId: true } } } });
  if (!scope || scope.project.workspaceId !== access.workspaceId) throw notFound("Scope not found");
  if (access.kind === "CLIENT" && (a.status === "DRAFT" || b.status === "DRAFT")) throw notFound("Scope version not found");
  const fa = new Map(((a.features ?? []) as Feature[]).map((f) => [f.id, f]));
  const fb = new Map(((b.features ?? []) as Feature[]).map((f) => [f.id, f]));
  const added = [...fb.values()].filter((f) => !fa.has(f.id));
  const removed = [...fa.values()].filter((f) => !fb.has(f.id));
  const modified = [...fb.values()].filter((f) => {
    const old = fa.get(f.id);
    return old && JSON.stringify(old) !== JSON.stringify(f);
  }).map((f) => ({ before: fa.get(f.id), after: f }));
  const set = (v: unknown) => new Set((v ?? []) as string[]);
  const da = set(a.deliverables), db = set(b.deliverables);
  const ea = set(a.exclusions), eb = set(b.exclusions);
  return {
    from: { id: a.id, version: a.version, status: a.status },
    to: { id: b.id, version: b.version, status: b.status },
    features: { added, removed, modified },
    deliverables: { added: [...db].filter((x) => !da.has(x)), removed: [...da].filter((x) => !db.has(x)) },
    exclusions: { added: [...eb].filter((x) => !ea.has(x)), removed: [...ea].filter((x) => !eb.has(x)) },
  };
}
