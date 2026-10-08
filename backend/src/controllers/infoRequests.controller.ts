import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from '../middleware/auth';
import { paginate, paged } from '../utils/pagination';
import { assertProjectAccess } from '../middleware/rbac';

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  questions: z.array(z.union([z.string(), z.object({ q: z.string() })])).default([]),
  deadline: z.string().datetime().optional(),
});
const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  questions: z.array(z.any()).optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: z.enum(['DRAFT', 'SENT', 'ANSWERED', 'CLOSED']).optional(),
});

export async function createInfoRequest(req: AuthedRequest, res: Response) {
  const input = createSchema.parse(req.body);
  if (!(await assertProjectAccess(req.userId!, input.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const row = await prisma.informationRequest.create({
    data: { projectId: input.projectId, createdById: req.userId!, title: input.title, description: input.description, questions: input.questions as any, deadline: input.deadline ? new Date(input.deadline) : undefined },
  });
  res.status(201).json({ data: row });
}
export async function listInfoRequests(req: AuthedRequest, res: Response) {
  const projectId = req.query.projectId as string;
  if (!projectId) return res.status(400).json({ error: 'BadRequest', message: 'projectId required' });
  if (!(await assertProjectAccess(req.userId!, projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const { page, limit, skip, take } = paginate(req.query);
  const [total, data] = await Promise.all([
    prisma.informationRequest.count({ where: { projectId } }),
    prisma.informationRequest.findMany({ where: { projectId }, skip, take, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json(paged(data, total, page, limit));
}
export async function getInfoRequest(req: AuthedRequest, res: Response) {
  const row = await prisma.informationRequest.findUnique({ where: { id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, row.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  res.json({ data: row });
}
export async function patchInfoRequest(req: AuthedRequest, res: Response) {
  const existing = await prisma.informationRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, existing.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const data = patchSchema.parse(req.body);
  const row = await prisma.informationRequest.update({
    where: { id: req.params.id },
    data: { ...data, deadline: data.deadline === null ? null : data.deadline ? new Date(data.deadline) : undefined, questions: data.questions as any },
  });
  res.json({ data: row });
}
