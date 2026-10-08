import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from '../middleware/auth';
import { paginate, paged } from '../utils/pagination';
import { logActivity } from '../services/notify';

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  phone: z.string().optional(),
});
const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  company: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

async function mustBeMember(userId: string, workspaceId: string) {
  return prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
}

export async function createClient(req: AuthedRequest, res: Response) {
  const input = createSchema.parse(req.body);
  if (!(await mustBeMember(req.userId!, input.workspaceId))) return res.status(403).json({ error: 'Forbidden', message: 'Not a workspace member' });
  const client = await prisma.client.create({ data: input as any });
  await logActivity({ workspaceId: input.workspaceId, actorId: req.userId!, action: 'client.created', entityType: 'Client', entityId: client.id });
  res.status(201).json({ data: client });
}

export async function listClients(req: AuthedRequest, res: Response) {
  const workspaceId = req.query.workspaceId as string;
  if (!workspaceId) return res.status(400).json({ error: 'BadRequest', message: 'workspaceId query required' });
  if (!(await mustBeMember(req.userId!, workspaceId))) return res.status(403).json({ error: 'Forbidden', message: 'Not a member' });
  const { page, limit, skip, take } = paginate(req.query);
  const [total, data] = await Promise.all([
    prisma.client.count({ where: { workspaceId } }),
    prisma.client.findMany({ where: { workspaceId }, skip, take, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json(paged(data, total, page, limit));
}

export async function getClient(req: AuthedRequest, res: Response) {
  const client = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!client) return res.status(404).json({ error: 'NotFound', message: 'Client not found' });
  if (!(await mustBeMember(req.userId!, client.workspaceId))) return res.status(403).json({ error: 'Forbidden', message: 'Cross-workspace access denied' });
  res.json({ data: client });
}

export async function patchClient(req: AuthedRequest, res: Response) {
  const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Client not found' });
  if (!(await mustBeMember(req.userId!, existing.workspaceId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const data = patchSchema.parse(req.body);
  const client = await prisma.client.update({ where: { id: req.params.id }, data: data as any });
  res.json({ data: client });
}

export async function deleteClient(req: AuthedRequest, res: Response) {
  const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Client not found' });
  if (!(await mustBeMember(req.userId!, existing.workspaceId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  await prisma.client.delete({ where: { id: req.params.id } });
  res.json({ data: { ok: true } });
}
