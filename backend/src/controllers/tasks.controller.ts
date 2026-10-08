import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from '../middleware/auth';
import { paginate, paged } from '../utils/pagination';
import { assertProjectAccess } from '../middleware/rbac';
import { emitToProject, emitToUser } from '../lib/socket';
import { notifyUser } from '../services/notify';

const createSchema = z.object({
  projectId: z.string().min(1),
  scopeVersionId: z.string().optional(),
  requirementId: z.string().nullable().optional(),
  assigneeId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  deadline: z.string().datetime().optional(),
});
const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']).optional(),
  assigneeId: z.string().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
});
const bulkSchema = z.object({
  tasks: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    requirementId: z.string().nullable().optional(),
    assigneeId: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    deadline: z.string().datetime().optional(),
  })).min(1).max(100),
  scopeVersionId: z.string().optional(),
});

export async function createTask(req: AuthedRequest, res: Response) {
  const input = createSchema.parse(req.body);
  if (!(await assertProjectAccess(req.userId!, input.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const task = await prisma.task.create({
    data: {
      projectId: input.projectId, scopeVersionId: input.scopeVersionId, requirementId: input.requirementId ?? undefined,
      assigneeId: input.assigneeId, createdById: req.userId!, title: input.title, description: input.description,
      priority: input.priority as any, deadline: input.deadline ? new Date(input.deadline) : undefined,
    },
  });
  emitToProject(input.projectId, 'task:assigned', task);
  if (task.assigneeId) {
    emitToUser(task.assigneeId, 'task:assigned', task);
    await notifyUser(task.assigneeId, { type: 'TASK_ASSIGNED', title: 'New task assigned', body: task.title, entityId: task.id, entityType: 'Task' });
  }
  res.status(201).json({ data: task });
}

export async function listTasks(req: AuthedRequest, res: Response) {
  const { page, limit, skip, take } = paginate(req.query);
  const where: any = {};
  if (req.query.projectId) {
    if (!(await assertProjectAccess(req.userId!, req.query.projectId as string))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
    where.projectId = req.query.projectId;
  }
  if (req.query.status) where.status = req.query.status;
  if (req.query.assigneeId) where.assigneeId = req.query.assigneeId;
  const [total, data] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json(paged(data, total, page, limit));
}

export async function getTask(req: AuthedRequest, res: Response) {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, task.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  res.json({ data: task });
}

export async function patchTask(req: AuthedRequest, res: Response) {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, existing.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const data = patchSchema.parse(req.body);
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: { ...data, deadline: data.deadline === null ? null : data.deadline ? new Date(data.deadline) : undefined } as any,
  });
  emitToProject(task.projectId, 'task:updated', task);
  if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
    emitToUser(data.assigneeId, 'task:assigned', task);
    await notifyUser(data.assigneeId, { type: 'TASK_ASSIGNED', title: 'Task assigned', body: task.title, entityId: task.id, entityType: 'Task' });
  }
  res.json({ data: task });
}

export async function deleteTask(req: AuthedRequest, res: Response) {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, existing.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ data: { ok: true } });
}

export async function bulkCreateTasks(req: AuthedRequest, res: Response) {
  const projectId = req.params.projectId;
  if (!(await assertProjectAccess(req.userId!, projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const input = bulkSchema.parse(req.body);
  const created = await prisma.$transaction(
    input.tasks.map((t) => prisma.task.create({
      data: {
        projectId, scopeVersionId: input.scopeVersionId, requirementId: t.requirementId ?? undefined,
        assigneeId: t.assigneeId, createdById: req.userId!, title: t.title, description: t.description,
        priority: t.priority as any, deadline: t.deadline ? new Date(t.deadline) : undefined,
      },
    }))
  );
  emitToProject(projectId, 'tasks:created', { count: created.length });
  for (const t of created) {
    if (t.assigneeId) {
      emitToUser(t.assigneeId, 'task:assigned', t);
      await notifyUser(t.assigneeId, { type: 'TASK_ASSIGNED', title: 'New task assigned', body: t.title, entityId: t.id, entityType: 'Task' });
    }
  }
  res.status(201).json({ data: created });
}
