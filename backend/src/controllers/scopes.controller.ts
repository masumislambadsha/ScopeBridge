import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from '../middleware/auth';
import { paginate, paged } from '../utils/pagination';
import { assertProjectAccess } from '../middleware/rbac';
import { aiScopeQueue } from '../queues/queues';
import { emitToProject } from '../lib/socket';
import { notifyProjectMembers } from '../services/notify';

const createSchema = z.object({
  projectId: z.string().min(1),
  features: z.array(z.any()).default([]),
  deliverables: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  deadline: z.string().datetime().optional(),
});
const patchSchema = z.object({
  features: z.array(z.any()).optional(),
  deliverables: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']).optional(),
});

export async function createScope(req: AuthedRequest, res: Response) {
  const input = createSchema.parse(req.body);
  if (!(await assertProjectAccess(req.userId!, input.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const scope = await prisma.$transaction(async (tx: any) => {
    const s = await tx.scope.create({
      data: {
        projectId: input.projectId, features: input.features as any,
        deliverables: input.deliverables as any, exclusions: input.exclusions as any,
        deadline: input.deadline ? new Date(input.deadline) : undefined, status: 'DRAFT', source: 'MANUAL',
      },
    });
    await tx.scopeVersion.create({
      data: { scopeId: s.id, version: 1, snapshot: { features: input.features, deliverables: input.deliverables, exclusions: input.exclusions } as any, createdById: req.userId!, status: 'DRAFT' },
    });
    return s;
  });
  // enqueue AI-04 scope draft enrichment (fills acceptance criteria / exclusions); graceful fallback to manual
  try { await aiScopeQueue.add('scope-draft', { projectId: input.projectId, scopeId: scope.id }); } catch { /* manual mode */ }
  res.status(201).json({ data: scope });
}

export async function getScope(req: AuthedRequest, res: Response) {
  const scope = await prisma.scope.findUnique({ where: { id: req.params.id }, include: { versions: { orderBy: { version: 'desc' } } } });
  if (!scope) return res.status(404).json({ error: 'NotFound', message: 'Scope not found' });
  const project = await prisma.project.findUnique({ where: { id: scope.projectId } });
  if (!project || !(await assertProjectAccess(req.userId!, project.id))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  res.json({ data: scope });
}

export async function patchScope(req: AuthedRequest, res: Response) {
  const existing = await prisma.scope.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, existing.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const data = patchSchema.parse(req.body);
  const row = await prisma.scope.update({
    where: { id: req.params.id },
    data: { ...data, deadline: data.deadline === null ? null : data.deadline ? new Date(data.deadline) : undefined } as any,
  });
  res.json({ data: row });
}

export async function createVersion(req: AuthedRequest, res: Response) {
  const existing = await prisma.scope.findUnique({ where: { id: req.params.id }, include: { versions: true } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, existing.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const nextVersion = Math.max(0, ...existing.versions.map((v: any) => v.version)) + 1;
  const snapshot = { features: existing.features, deliverables: existing.deliverables, exclusions: existing.exclusions, status: existing.status };
  const v = await prisma.scopeVersion.create({ data: { scopeId: existing.id, version: nextVersion, snapshot: snapshot as any, createdById: req.userId!, status: 'DRAFT' } });
  res.status(201).json({ data: v });
}

export async function listVersions(req: AuthedRequest, res: Response) {
  const existing = await prisma.scope.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, existing.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const { page, limit, skip, take } = paginate(req.query);
  const [total, data] = await Promise.all([
    prisma.scopeVersion.count({ where: { scopeId: existing.id } }),
    prisma.scopeVersion.findMany({ where: { scopeId: existing.id }, skip, take, orderBy: { version: 'desc' } }),
  ]);
  res.json(paged(data, total, page, limit));
}

export async function getVersion(req: AuthedRequest, res: Response) {
  const v = await prisma.scopeVersion.findUnique({ where: { id: req.params.id }, include: { scope: true } });
  if (!v) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, v.scope.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  res.json({ data: v });
}

const approvalReqSchema = z.object({ clientId: z.string().min(1), scopeVersionId: z.string().min(1) });

export async function requestApproval(req: AuthedRequest, res: Response) {
  const scope = await prisma.scope.findUnique({ where: { id: req.params.id } });
  if (!scope) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, scope.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const { clientId, scopeVersionId } = approvalReqSchema.parse(req.body);
  const approval = await prisma.$transaction(async (tx: any) => {
    await tx.scope.update({ where: { id: scope.id }, data: { status: 'PENDING_APPROVAL' } });
    return tx.approval.create({ data: { scopeId: scope.id, scopeVersionId, clientId, requestedById: req.userId!, status: 'PENDING' } });
  });
  emitToProject(scope.projectId, 'approval:requested', { approvalId: approval.id, scopeId: scope.id });
  await notifyProjectMembers(scope.projectId, { type: 'APPROVAL_REQUESTED', title: 'Approval requested', body: 'Scope sent for client approval', entityId: approval.id, entityType: 'Approval' });
  res.status(201).json({ data: approval });
}
