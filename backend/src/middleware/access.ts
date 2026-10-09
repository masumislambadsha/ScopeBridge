import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { amw, forbidden, notFound } from "../core/http";
import { AuthedRequest } from "./auth";

export type WorkspaceRole = "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER";

export type Access =
  | { kind: "MEMBER"; userId: string; workspaceId: string; role: WorkspaceRole; isProjectMember: boolean }
  | { kind: "CLIENT"; userId: string; workspaceId: string; clientId: string };

export async function getWorkspaceAccess(userId: string, workspaceId: string): Promise<Access | null> {
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!m) return null;
  return { kind: "MEMBER", userId, workspaceId, role: m.role as WorkspaceRole, isProjectMember: false };
}

export async function getProjectAccess(userId: string, projectId: string): Promise<Access | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true, client: { select: { id: true, portalUserId: true } } },
  });
  if (!project) return null;
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (m) {
    let isProjectMember = m.role !== "TEAM_MEMBER";
    if (m.role === "TEAM_MEMBER") {
      const pm = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      isProjectMember = !!pm;
    }
    return { kind: "MEMBER", userId, workspaceId: project.workspaceId, role: m.role as WorkspaceRole, isProjectMember };
  }
  if (project.client.portalUserId === userId) {
    return { kind: "CLIENT", userId, workspaceId: project.workspaceId, clientId: project.client.id };
  }
  return null;
}

export type Permission =
  | "workspace.update" | "workspace.delete" | "workspace.settings" | "member.manage"
  | "client.crud" | "client.invite"
  | "project.create" | "project.update" | "project.delete" | "project.members" | "project.read"
  | "ir.crud" | "ir.send"
  | "submission.create" | "submission.read"
  | "requirement.crud" | "requirement.approve" | "requirement.clarify"
  | "scope.edit" | "scope.send"
  | "approval.decide"
  | "task.create" | "task.status" | "task.delete"
  | "cr.create" | "cr.review"
  | "message.write" | "message.read"
  | "ai.trigger"
  | "dashboard.view" | "activity.view";

export interface PermCtx {
  assigneeId?: string | null;
  approvalClientId?: string;
  targetClientId?: string;
  needsProjectMembership?: boolean;
}

const PM = (a: Access) => a.kind === "MEMBER" && (a.role === "ADMIN" || a.role === "PROJECT_MANAGER");

export function can(access: Access, perm: Permission, ctx: PermCtx = {}): boolean {
  const { kind } = access;
  switch (perm) {
    case "workspace.update":
    case "workspace.delete":
    case "workspace.settings":
    case "member.manage":
      return kind === "MEMBER" && access.role === "ADMIN";
    case "client.crud":
    case "client.invite":
      return PM(access);
    case "project.create":
    case "project.update":
    case "project.delete":
    case "project.members":
      return PM(access);
    case "project.read":
      if (kind === "CLIENT") return true;
      if (access.role !== "TEAM_MEMBER") return true;
      return ctx.needsProjectMembership ? access.isProjectMember : true;
    case "ir.crud":
    case "ir.send":
      return PM(access);
    case "submission.create":
      if (PM(access)) return true;
      return kind === "CLIENT" && (!ctx.targetClientId || ctx.targetClientId === access.clientId);
    case "submission.read":
      return kind === "MEMBER";
    case "requirement.crud":
    case "requirement.approve":
    case "requirement.clarify":
      return PM(access);
    case "scope.edit":
    case "scope.send":
      return PM(access);
    case "approval.decide":
      return kind === "CLIENT" && ctx.approvalClientId === access.clientId;
    case "task.create":
    case "task.delete":
      return PM(access);
    case "task.status":
      if (PM(access)) return true;
      if (kind === "MEMBER" && access.role === "TEAM_MEMBER") {
        return !!ctx.assigneeId && ctx.assigneeId === access.userId;
      }
      return false;
    case "cr.create":
      if (PM(access)) return true;
      return kind === "CLIENT" && (!ctx.targetClientId || ctx.targetClientId === access.clientId);
    case "cr.review":
      return PM(access);
    case "message.write":
    case "message.read":
      return kind === "MEMBER" || kind === "CLIENT";
    case "ai.trigger":
      return PM(access);
    case "dashboard.view":
    case "activity.view":
      return true; // scoped per-role in services (team: own view; client: portal summary)
    default:
      return false;
  }
}

export interface AccessRequest extends AuthedRequest {
  access?: Access;
}

/** Resolve project access from `projectId` and enforce a permission. 404 when no access (never leak). */
export function requireProjectAccess(perm: Permission, getProjectId: (req: Request) => string | undefined, ctx?: (req: Request) => PermCtx | Promise<PermCtx>) {
  return amw(async (req: AccessRequest, _res: Response, next: NextFunction) => {
    const projectId = getProjectId(req);
    if (!projectId) throw notFound("Project not found");
    const access = await getProjectAccess(req.userId!, projectId);
    if (!access) throw notFound("Project not found");
    if (!can(access, perm, (await ctx?.(req)) ?? {})) {
      // Same-workspace but insufficient role → 403; cross-workspace already 404 above.
      throw forbidden("Insufficient permission");
    }
    if (access.kind === "MEMBER" && access.role === "TEAM_MEMBER" && !access.isProjectMember) {
      throw notFound("Project not found");
    }
    req.access = access;
    next();
  });
}

/** Resolve workspace access and enforce a permission. */
export function requireWorkspaceAccess(perm: Permission, getWorkspaceId: (req: Request) => string | undefined) {
  return amw(async (req: AccessRequest, _res: Response, next: NextFunction) => {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) throw notFound("Workspace not found");
    const access = await getWorkspaceAccess(req.userId!, workspaceId);
    if (!access) throw notFound("Workspace not found");
    if (!can(access, perm)) throw forbidden("Insufficient permission");
    req.access = access;
    next();
  });
}

/** Resolve access from a client: workspace members via the client's workspace, portal users via portalUserId. */
export function requireClientAccess(perm: Permission, getClientId: (req: Request) => string | undefined) {
  return amw(async (req: AccessRequest, _res: Response, next: NextFunction) => {
    const clientId = getClientId(req);
    if (!clientId) throw notFound("Client not found");
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw notFound("Client not found");
    let access = await getWorkspaceAccess(req.userId!, client.workspaceId);
    if (!access && client.portalUserId === req.userId) {
      access = { kind: "CLIENT", userId: req.userId!, workspaceId: client.workspaceId, clientId: client.id };
    }
    if (!access) throw notFound("Client not found");
    if (!can(access, perm, { targetClientId: client.id })) throw forbidden("Insufficient permission");
    req.access = access;
    next();
  });
}

/** Like requireProjectAccess, but the projectId is loaded asynchronously (e.g. from the entity itself). */
export function requireEntityAccess(
  perm: Permission,
  loadProjectId: (req: Request) => Promise<string | null | undefined>,
  ctx?: (req: Request) => PermCtx | Promise<PermCtx>,
  notFoundMessage = "Resource not found",
) {
  return amw(async (req: AccessRequest, _res: Response, next: NextFunction) => {
    const projectId = await loadProjectId(req);
    if (!projectId) throw notFound(notFoundMessage);
    const access = await getProjectAccess(req.userId!, projectId);
    if (!access) throw notFound(notFoundMessage);
    if (!can(access, perm, (await ctx?.(req)) ?? {})) throw forbidden("Insufficient permission");
    if (access.kind === "MEMBER" && access.role === "TEAM_MEMBER" && !access.isProjectMember) {
      throw notFound(notFoundMessage);
    }
    req.access = access;
    next();
  });
}

/**
 * Attach a best-effort access for collection routes without a project scope:
 * first workspace membership, else first portal client link. Services narrow further.
 */
export const attachMembership = amw(async (req: AccessRequest, _res: Response, next: NextFunction) => {
  const m = await prisma.workspaceMember.findFirst({ where: { userId: req.userId! } });
  if (m) {
    req.access = { kind: "MEMBER", userId: req.userId!, workspaceId: m.workspaceId, role: m.role as WorkspaceRole, isProjectMember: false };
    next();
    return;
  }
  const c = await prisma.client.findFirst({ where: { portalUserId: req.userId! } });
  if (c) {
    req.access = { kind: "CLIENT", userId: req.userId!, workspaceId: c.workspaceId, clientId: c.id };
    next();
    return;
  }
  throw notFound("Workspace not found");
});
