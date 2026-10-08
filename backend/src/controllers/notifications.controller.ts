import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from '../middleware/auth';
import { paginate, paged } from '../utils/pagination';

export async function listNotifications(req: AuthedRequest, res: Response) {
  const { page, limit, skip, take } = paginate(req.query);
  const where: any = { userId: req.userId! };
  if (req.query.unread === '1') where.read = false;
  const [total, data] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json(paged(data, total, page, limit));
}

export async function markRead(req: AuthedRequest, res: Response) {
  const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!n || n.userId !== req.userId) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
  res.json({ data: updated });
}

export async function listActivity(req: AuthedRequest, res: Response) {
  const workspaceId = req.query.workspaceId as string;
  if (!workspaceId) return res.status(400).json({ error: 'BadRequest', message: 'workspaceId required' });
  const member = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: req.userId! } } });
  if (!member) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const { page, limit, skip, take } = paginate(req.query);
  const where: any = { workspaceId };
  if (req.query.projectId) where.projectId = req.query.projectId;
  const [total, data] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json(paged(data, total, page, limit));
}
