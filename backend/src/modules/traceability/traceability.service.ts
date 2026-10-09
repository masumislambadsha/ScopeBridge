import { prisma } from "../../lib/prisma";
import { notFound } from "../../core/http";
import { Access } from "../../middleware/access";

/** Full traceability chain for a project (core USP). Client-safe when accessed via portal. */
export async function traceability(access: Access, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: { select: { id: true, name: true, company: true } } },
  });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  if (access.kind === "CLIENT" && project.clientId !== access.clientId) throw notFound("Project not found");

  const [submissions, requirements, versions, tasks, crs, approvals] = await Promise.all([
    prisma.submission.findMany({
      where: { projectId }, orderBy: { createdAt: "asc" },
      select: { id: true, informationRequestId: true, status: true, createdAt: true, files: { select: { id: true, originalName: true, mimeType: true } } },
    }),
    prisma.requirement.findMany({
      where: access.kind === "CLIENT"
        ? { projectId, status: { in: ["READY", "APPROVED", "NEEDS_CLARIFICATION"] } }
        : { projectId },
      orderBy: { code: "asc" },
      select: access.kind === "CLIENT"
        ? { id: true, code: true, title: true, description: true, status: true, acceptanceCriteria: true }
        : { id: true, code: true, title: true, status: true, source: true, submissionId: true, fileId: true, changeRequestId: true, acceptanceCriteria: true },
    }),
    prisma.scopeVersion.findMany({
      where: access.kind === "CLIENT"
        ? { scope: { projectId }, status: { not: "DRAFT" } }
        : { scope: { projectId } },
      orderBy: { version: "asc" },
      select: { id: true, version: true, status: true, createdAt: true, approvedAt: true, requirementLinks: { select: { requirementId: true } } },
    }),
    prisma.task.findMany({
      where: { projectId }, orderBy: { code: "asc" },
      select: access.kind === "CLIENT"
        ? { id: true, code: true, title: true, status: true, requirementId: true, scopeVersionId: true, changeRequestId: true }
        : { id: true, code: true, title: true, status: true, requirementId: true, scopeVersionId: true, changeRequestId: true, assigneeId: true },
    }),
    prisma.changeRequest.findMany({
      where: { projectId }, orderBy: { code: "asc" },
      select: { id: true, code: true, title: true, status: true, aiClassification: true, finalClassification: true, baseScopeVersionId: true, proposedScopeVersionId: true, resultingScopeVersionId: true },
    }),
    prisma.approval.findMany({
      where: { scope: { projectId } }, orderBy: { createdAt: "asc" },
      select: access.kind === "CLIENT"
        ? { id: true, status: true, decidedAt: true, comment: true, signatureName: true, scopeVersionId: true }
        : { id: true, status: true, decidedAt: true, comment: true, signatureName: true, scopeVersionId: true, requestedById: true, decidedById: true },
    }),
  ]);

  const reqById = new Map(requirements.map((r) => [r.id, r]));
  void reqById;
  const versionReqs = new Map(versions.map((v) => [v.id, v.requirementLinks.map((l) => l.requirementId)]));
  const reqVersions = new Map<string, string[]>();
  for (const v of versions) {
    for (const rid of versionReqs.get(v.id) ?? []) {
      reqVersions.set(rid, [...(reqVersions.get(rid) ?? []), v.id]);
    }
  }
  const reqTasks = new Map<string, string[]>();
  const crTasks = new Map<string, string[]>();
  for (const t of tasks) {
    if (t.requirementId) reqTasks.set(t.requirementId, [...(reqTasks.get(t.requirementId) ?? []), t.id]);
    if (t.changeRequestId) crTasks.set(t.changeRequestId, [...(crTasks.get(t.changeRequestId) ?? []), t.id]);
  }

  const stage = (() => {
    if (crs.some((c) => c.status === "PENDING" || c.status === "UNDER_REVIEW")) return "changes";
    if (tasks.length && tasks.every((t) => t.status === "COMPLETED")) return "completed";
    if (tasks.length) return "development";
    if (versions.some((v) => v.status === "APPROVED")) return "approved";
    if (versions.length) return "scope";
    if (requirements.length) return "requirements";
    return "intake";
  })();

  return {
    project: { id: project.id, name: project.name, status: project.status, client: project.client, stage },
    submissions, requirements, versions, tasks, changeRequests: crs, approvals,
    links: {
      requirementVersions: Object.fromEntries(reqVersions),
      requirementTasks: Object.fromEntries(reqTasks),
      changeRequestTasks: Object.fromEntries(crTasks),
    },
  };
}
