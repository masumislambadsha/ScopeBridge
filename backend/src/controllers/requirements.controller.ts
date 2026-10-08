import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from '../middleware/auth';
import { paginate, paged } from '../utils/pagination';
import { assertProjectAccess } from '../middleware/rbac';
import { aiReadinessQueue } from '../queues/queues';

const createSchema = z.object({
  projectId: z.string().min(1),
  submissionId: z.string().nullable().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().default('general'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  acceptanceCriteria: z.array(z.string()).default([]),
});
const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['DRAFT', 'ACCEPTED', 'REJECTED']).optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
});

export async function createRequirement(req: AuthedRequest, res: Response) {
  const input = createSchema.parse(req.body);
  if (!(await assertProjectAccess(req.userId!, input.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const row = await prisma.requirement.create({ data: { ...input, acceptanceCriteria: input.acceptanceCriteria as any, source: 'MANUAL', status: 'DRAFT' } as any });
  res.status(201).json({ data: row });
}
export async function listRequirements(req: AuthedRequest, res: Response) {
  const projectId = req.query.projectId as string;
  if (!projectId) return res.status(400).json({ error: 'BadRequest', message: 'projectId required' });
  if (!(await assertProjectAccess(req.userId!, projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const { page, limit, skip, take } = paginate(req.query);
  const where: any = { projectId };
  if (req.query.status) where.status = req.query.status;
  const [total, data] = await Promise.all([
    prisma.requirement.count({ where }),
    prisma.requirement.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json(paged(data, total, page, limit));
}
export async function getRequirement(req: AuthedRequest, res: Response) {
  const row = await prisma.requirement.findUnique({ where: { id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, row.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  res.json({ data: row });
}
export async function patchRequirement(req: AuthedRequest, res: Response) {
  const existing = await prisma.requirement.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, existing.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const data = patchSchema.parse(req.body);
  const row = await prisma.requirement.update({ where: { id: req.params.id }, data: data as any });
  // If accepted, optionally trigger readiness analysis via query flag
  if (data.status === 'ACCEPTED' || req.query.analyze === '1') {
    await aiReadinessQueue.add('readiness', { projectId: existing.projectId });
  }
  res.json({ data: row });
}
export async function deleteRequirement(req: AuthedRequest, res: Response) {
  const existing = await prisma.requirement.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, existing.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  await prisma.requirement.delete({ where: { id: req.params.id } });
  res.json({ data: { ok: true } });
}
export async function triggerReadiness(req: AuthedRequest, res: Response) {
  const projectId = (req.body?.projectId ?? req.query.projectId) as string;
  if (!projectId) return res.status(400).json({ error: 'BadRequest', message: 'projectId required' });
  if (!(await assertProjectAccess(req.userId!, projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  await aiReadinessQueue.add('readiness', { projectId });
  res.json({ data: { queued: true } });
}
