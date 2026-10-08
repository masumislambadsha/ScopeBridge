import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from '../middleware/auth';
import { paginate, paged } from '../utils/pagination';
import { assertProjectAccess } from '../middleware/rbac';
import { aiChangeQueue } from '../queues/queues';
import { emitToProject } from '../lib/socket';
import { notifyProjectMembers } from '../services/notify';

const createSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  scopeVersionId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  fileUrl: z.string().url().optional(),
});
const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['PENDING_ANALYSIS', 'ANALYZED', 'NEEDS_MANUAL_REVIEW', 'ACCEPTED', 'REJECTED']).optional(),
});

export async function createChangeRequest(req: AuthedRequest, res: Response) {
  const input = createSchema.parse(req.body);
  if (!(await assertProjectAccess(req.userId!, input.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const cr = await prisma.changeRequest.create({ data: { ...input, status: 'PENDING_ANALYSIS' } as any });
  emitToProject(input.projectId, 'change-request:new', { id: cr.id });
  await notifyProjectMembers(input.projectId, { type: 'CR_NEW', title: 'New change request', body: cr.title, entityId: cr.id, entityType: 'ChangeRequest' });
  // auto-enqueue AI-05 analysis; PM decides final outcome
  try { await aiChangeQueue.add('analyze', { changeRequestId: cr.id }); } catch { /* manual fallback */ }
  res.status(201).json({ data: cr });
}

export async function listChangeRequests(req: AuthedRequest, res: Response) {
  const { page, limit, skip, take } = paginate(req.query);
  const where: any = {};
  if (req.query.projectId) {
    if (!(await assertProjectAccess(req.userId!, req.query.projectId as string))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
    where.projectId = req.query.projectId;
  }
  if (req.query.status) where.status = req.query.status;
  const [total, data] = await Promise.all([
    prisma.changeRequest.count({ where }),
    prisma.changeRequest.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json(paged(data, total, page, limit));
}

export async function getChangeRequest(req: AuthedRequest, res: Response) {
  const cr = await prisma.changeRequest.findUnique({ where: { id: req.params.id } });
  if (!cr) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, cr.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  res.json({ data: cr });
}

export async function patchChangeRequest(req: AuthedRequest, res: Response) {
  const existing = await prisma.changeRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, existing.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const data = patchSchema.parse(req.body);
  const row = await prisma.changeRequest.update({ where: { id: req.params.id }, data: data as any });
  res.json({ data: row });
}

export async function analyzeChangeRequest(req: AuthedRequest, res: Response) {
  const existing = await prisma.changeRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, existing.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  await aiChangeQueue.add('analyze', { changeRequestId: existing.id });
  res.json({ data: { queued: true } });
}

export async function acceptChangeRequest(req: AuthedRequest, res: Response) {
  const existing = await prisma.changeRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, existing.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  // Human confirms — AI never makes final decision. Create new scope version snapshot noting the change.
  const row = await prisma.changeRequest.update({ where: { id: req.params.id }, data: { status: 'ACCEPTED', decidedAt: new Date() } });
  emitToProject(existing.projectId, 'change-request:decided', { id: row.id, decision: 'ACCEPTED' });
  res.json({ data: row });
}

export async function rejectChangeRequest(req: AuthedRequest, res: Response) {
  const existing = await prisma.changeRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, existing.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const row = await prisma.changeRequest.update({ where: { id: req.params.id }, data: { status: 'REJECTED', decidedAt: new Date() } });
  emitToProject(existing.projectId, 'change-request:decided', { id: row.id, decision: 'REJECTED' });
  res.json({ data: row });
}
