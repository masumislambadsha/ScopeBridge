import { prisma } from '../lib/prisma';
import { emitToUser, emitToProject } from '../lib/socket';

export async function notifyUser(userId: string, n: { type: string; title: string; body?: string; entityId?: string; entityType?: string }) {
  const row = await prisma.notification.create({ data: { userId, ...n } });
  emitToUser(userId, 'notification:new', row);
  return row;
}

export async function notifyProjectMembers(projectId: string, n: { type: string; title: string; body?: string; entityId?: string; entityType?: string }, excludeUserId?: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
  if (!project) return;
  const members = await prisma.workspaceMember.findMany({ where: { workspaceId: project.workspaceId }, select: { userId: true } });
  for (const m of members) {
    if (excludeUserId && m.userId === excludeUserId) continue;
    await notifyUser(m.userId, n);
  }
  emitToProject(projectId, 'notification:new', n);
}

export async function logActivity(data: { workspaceId: string; projectId?: string; actorId: string; action: string; entityType: string; entityId?: string; metadata?: any }) {
  return prisma.activityLog.create({ data: data as any });
}
