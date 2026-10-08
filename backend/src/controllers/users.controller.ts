import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from '../middleware/auth';
import { paginate, paged } from '../utils/pagination';

export async function listUsers(req: AuthedRequest, res: Response) {
  const { page, limit, skip, take } = paginate(req.query);
  const q = (req.query.search as string) ?? '';
  const where = q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] } : {};
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, skip, take, select: { id: true, name: true, email: true, createdAt: true } }),
  ]);
  res.json(paged(users, total, page, limit));
}
export async function getUser(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, name: true, email: true, createdAt: true, updatedAt: true } });
  if (!user) return res.status(404).json({ error: 'NotFound', message: 'User not found' });
  res.json({ data: user });
}
const patchSchema = z.object({ name: z.string().min(1).optional() });
export async function patchUser(req: AuthedRequest, res: Response) {
  if (req.userId !== req.params.id) return res.status(403).json({ error: 'Forbidden', message: 'Can only edit own profile' });
  const data = patchSchema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.params.id }, data, select: { id: true, name: true, email: true } });
  res.json({ data: user });
}
