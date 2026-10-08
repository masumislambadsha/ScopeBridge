import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from '../middleware/auth';
import { paginate, paged } from '../utils/pagination';
import { logActivity } from '../services/notify';
import { assertProjectAccess } from '../middleware/rbac';

const createSchema = z.object({
  workspaceId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
});
const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
});

export async function createProject(req: AuthedRequest, res: Response) {
  const input = createSchema.parse(req.body);
  const member = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: req.userId! } } });
  if (!member || (member.role === 'TEAM_MEMBER')) return res.status(403).json({ error: 'Forbidden', message: 'PM or Admin only' });
  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client || client.workspaceId !== input.workspaceId) return res.status(400).json({ error: 'BadRequest', message: 'Client must belong to workspace' });
  const project = await prisma.project.create({
    data: {
      workspaceId: input.workspaceId, clientId: input.clientId, name: input.name, description: input.description,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
    },
  });
  await logActivity({ workspaceId: input.workspaceId, projectId: project.id, actorId: req.userId!, action: 'project.created', entityType: 'Project', entityId: project.id });
  res.status(201).json({ data: project });
}

export async function listProjects(req: AuthedRequest, res: Response) {
  const workspaceId = req.query.workspaceId as string;
  if (!workspaceId) return res.status(400).json({ error: 'BadRequest', message: 'workspaceId required' });
  const member = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: req.userId! } } });
  if (!member) return res.status(403).json({ error: 'Forbidden', message: 'Not a member' });
  const { page, limit, skip, take } = paginate(req.query);
  const where: any = { workspaceId };
  if (req.query.status) where.status = req.query.status;
  const [total, data] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { client: true } }),
  ]);
  res.json(paged(data, total, page, limit));
}

export async function getProject(req: AuthedRequest, res: Response) {
  const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: { client: true } });
  if (!project) return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
  if (!(await assertProjectAccess(req.userId!, project.id))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  res.json({ data: project });
}

export async function patchProject(req: AuthedRequest, res: Response) {
  const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
  if (!(await assertProjectAccess(req.userId!, existing.id))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const data = patchSchema.parse(req.body);
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      ...data,
      startDate: data.startDate === null ? null : data.startDate ? new Date(data.startDate) : undefined,
      deadline: data.deadline === null ? null : data.deadline ? new Date(data.deadline) : undefined,
    } as any,
  });
  res.json({ data: project });
}

export async function deleteProject(req: AuthedRequest, res: Response) {
  const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
  if (!(await assertProjectAccess(req.userId!, existing.id))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ data: { ok: true } });
}

export async function dashboardAnalytics(req: AuthedRequest, res: Response) {
  const workspaceId = req.query.workspaceId as string;
  if (!workspaceId) return res.status(400).json({ error: 'BadRequest', message: 'workspaceId required' });
  const member = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: req.userId! } } });
  if (!member) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const [projects, tasksByStatus, crByStatus, approvalsPending] = await Promise.all([
    prisma.project.groupBy({ by: ['status'], where: { workspaceId }, _count: true }),
    prisma.task.groupBy({ by: ['status'], where: { project: { workspaceId } }, _count: true }),
    prisma.changeRequest.groupBy({ by: ['status'], where: { project: { workspaceId } }, _count: true }),
    prisma.approval.count({ where: { status: 'PENDING', scope: { project: { workspaceId } } } }),
  ]);
  res.json({ data: { projects, tasksByStatus, crByStatus, approvalsPending } });
}
