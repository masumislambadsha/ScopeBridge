import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from './auth';

// Ensures the acting user is a member of the workspace. Attaches role.
export function requireWorkspaceRole(allowed: Array<'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER'>) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const workspaceId = req.params.id ?? req.params.workspaceId ?? (req.body?.workspaceId as string) ?? (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ error: 'BadRequest', message: 'workspaceId is required' });
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspaceId as string, userId: req.userId! } },
    });
    if (!membership) return res.status(403).json({ error: 'Forbidden', message: 'Not a workspace member' });
    if (!allowed.includes(membership.role)) return res.status(403).json({ error: 'Forbidden', message: 'Insufficient role' });
    (req as any).workspaceRole = membership.role;
    (req as any).workspaceId = workspaceId;
    next();
  };
}

// Helper: get workspaceId for a project, enforcing membership. Returns workspaceId or null.
export async function assertProjectAccess(userId: string, projectId: string): Promise<string | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
  if (!project) return null;
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  return m ? project.workspaceId : null;
}
