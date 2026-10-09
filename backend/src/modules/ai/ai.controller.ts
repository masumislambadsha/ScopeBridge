import { Response } from "express";
import { prisma } from "../../lib/prisma";
import { notFound } from "../../core/http";
import { okBody } from "../../core/http";
import { AccessRequest, Access, WorkspaceRole, getProjectAccess, getWorkspaceAccess } from "../../middleware/access";
import * as S from "./ai.service";

/** Targets must belong to a workspace the caller belongs to (never leak across workspaces). */
async function assertTargetWorkspace(userId: string, projectId: string | null) {
  if (!projectId) throw notFound("Target not found");
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
  if (!project) throw notFound("Target not found");
  const access = await getWorkspaceAccess(userId, project.workspaceId);
  if (!access) throw notFound("Target not found");
}

/** Attach req.access from the target project (AI routes carry projectId in the body). */
async function attachAccess(req: AccessRequest, projectId: string | null): Promise<Access> {
  if (!projectId) throw notFound("Target not found");
  const access = await getProjectAccess(req.userId!, projectId);
  if (!access) throw notFound("Target not found");
  req.access = access;
  return access;
}

/** For projectType-only checklist calls: attach the caller's first workspace membership. */
async function attachAnyMembership(req: AccessRequest): Promise<Access> {
  const m = await prisma.workspaceMember.findFirst({ where: { userId: req.userId! } });
  if (!m) throw notFound("Target not found");
  const access: Access = { kind: "MEMBER", userId: req.userId!, workspaceId: m.workspaceId, role: m.role as WorkspaceRole, isProjectMember: false };
  req.access = access;
  return access;
}

export async function checklist(req: AccessRequest, res: Response) {
  const body = req.body as { projectId?: string; projectType?: string };
  if (body.projectId) await attachAccess(req, body.projectId);
  else await attachAnyMembership(req);
  S.assertAiTrigger(req.access!);
  let projectType = body.projectType;
  if (body.projectId) {
    await assertTargetWorkspace(req.userId!, body.projectId);
    const p = await prisma.project.findUnique({ where: { id: body.projectId }, select: { projectType: true } });
    if (!p) throw notFound("Project not found");
    projectType = p.projectType;
  }
  res.json(okBody(await S.checklist(projectType!)));
}

export async function extract(req: AccessRequest, res: Response) {
  const { submissionId } = req.body as { submissionId: string };
  const sub = await prisma.submission.findUnique({ where: { id: submissionId }, select: { projectId: true } });
  if (!sub) throw notFound("Submission not found");
  await attachAccess(req, sub.projectId);
  S.assertAiTrigger(req.access!);
  const run = await S.queueExtraction(submissionId, sub.projectId, req.userId!);
  res.status(202).json(okBody({ aiRunId: run.id }));
}

export async function readiness(req: AccessRequest, res: Response) {
  const { projectId } = req.body as { projectId: string };
  await attachAccess(req, projectId);
  S.assertAiTrigger(req.access!);
  const run = await S.queueReadiness(projectId, req.userId!);
  res.status(202).json(okBody({ aiRunId: run.id }));
}

export async function acceptance(req: AccessRequest, res: Response) {
  const body = req.body as { requirementIds?: string[]; scopeVersionId?: string; replace?: boolean };
  let projectId: string | null = null;
  if (body.scopeVersionId) {
    const v = await prisma.scopeVersion.findUnique({ where: { id: body.scopeVersionId }, select: { scope: { select: { projectId: true } } } });
    projectId = v?.scope.projectId ?? null;
  } else if (body.requirementIds?.length) {
    const r = await prisma.requirement.findUnique({ where: { id: body.requirementIds[0] }, select: { projectId: true } });
    projectId = r?.projectId ?? null;
  }
  await attachAccess(req, projectId);
  S.assertAiTrigger(req.access!);
  const run = await S.queueAcceptance({ ...body, replace: body.replace ?? false }, projectId!, req.userId!);
  res.status(202).json(okBody({ aiRunId: run.id }));
}

export async function scopeAnalysis(req: AccessRequest, res: Response) {
  const { changeRequestId } = req.body as { changeRequestId: string };
  const cr = await prisma.changeRequest.findUnique({ where: { id: changeRequestId }, select: { projectId: true } });
  if (!cr) throw notFound("Change request not found");
  await attachAccess(req, cr.projectId);
  S.assertAiTrigger(req.access!);
  const run = await S.queueScopeAnalysis(changeRequestId, cr.projectId, req.userId!);
  res.status(202).json(okBody({ aiRunId: run.id }));
}

export async function getRun(req: AccessRequest, res: Response) {
  res.json(okBody(await S.getRun(req.access!, req.params.id)));
}
