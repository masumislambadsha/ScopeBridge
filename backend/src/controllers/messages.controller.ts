import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from '../middleware/auth';
import { paginate, paged } from '../utils/pagination';
import { assertProjectAccess } from '../middleware/rbac';

const createSchema = z.object({ projectId: z.string().min(1), content: z.string().min(1).max(5000) });

export async function createMessage(req: AuthedRequest, res: Response) {
  const input = createSchema.parse(req.body);
  if (!(await assertProjectAccess(req.userId!, input.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const msg = await prisma.message.create({ data: { projectId: input.projectId, senderId: req.userId!, content: input.content }, include: { sender: { select: { id: true, name: true } } } });
  const { getIO } = await import('../lib/socket');
  getIO()?.to(`project:${input.projectId}`).emit('message:new', msg);
  res.status(201).json({ data: msg });
}

export async function listMessages(req: AuthedRequest, res: Response) {
  const projectId = req.query.projectId as string;
  if (!projectId) return res.status(400).json({ error: 'BadRequest', message: 'projectId required' });
  if (!(await assertProjectAccess(req.userId!, projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const { page, limit, skip, take } = paginate(req.query);
  const [total, data] = await Promise.all([
    prisma.message.count({ where: { projectId } }),
    prisma.message.findMany({ where: { projectId }, skip, take, orderBy: { createdAt: 'asc' }, include: { sender: { select: { id: true, name: true } } } }),
  ]);
  res.json(paged(data, total, page, limit));
}
