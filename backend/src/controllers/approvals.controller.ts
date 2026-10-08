import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from '../middleware/auth';
import { paginate, paged } from '../utils/pagination';
import { emitToProject } from '../lib/socket';
import { notifyProjectMembers } from '../services/notify';

const decideSchema = z.object({ comment: z.string().optional() });

export async function listApprovals(req: AuthedRequest, res: Response) {
  const { page, limit, skip, take } = paginate(req.query);
  const where: any = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.scopeId) where.scopeId = req.query.scopeId;
  const [total, data] = await Promise.all([
    prisma.approval.count({ where }),
    prisma.approval.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { scope: true, scopeVersion: true } }),
  ]);
  res.json(paged(data, total, page, limit));
}

export async function createApproval(req: AuthedRequest, res: Response) {
  const schema = z.object({ scopeId: z.string(), scopeVersionId: z.string(), clientId: z.string() });
  const input = schema.parse(req.body);
  const approval = await prisma.approval.create({ data: { ...input, requestedById: req.userId!, status: 'PENDING' } });
  res.status(201).json({ data: approval });
}

async function decide(req: AuthedRequest, res: Response, status: 'APPROVED' | 'REJECTED') {
  const { comment } = decideSchema.parse(req.body ?? {});
  const approval = await prisma.approval.findUnique({ where: { id: req.params.id }, include: { scope: true, scopeVersion: true } });
  if (!approval) return res.status(404).json({ error: 'NotFound', message: 'Approval not found' });
  const updated = await prisma.$transaction(async (tx: any) => {
    const a = await tx.approval.update({ where: { id: approval.id }, data: { status, decidedAt: new Date(), comment } });
    if (status === 'APPROVED') {
      await tx.scopeVersion.update({ where: { id: approval.scopeVersionId }, data: { status: 'APPROVED' } });
      await tx.scope.update({ where: { id: approval.scopeId }, data: { status: 'APPROVED', approvedVersionId: approval.scopeVersionId } });
      await tx.scopeVersion.updateMany({ where: { scopeId: approval.scopeId, id: { not: approval.scopeVersionId }, status: 'APPROVED' }, data: { status: 'SUPERSEDED' } });
    } else {
      await tx.scope.update({ where: { id: approval.scopeId }, data: { status: 'REJECTED' } });
    }
    return a;
  });
  const event = status === 'APPROVED' ? 'scope:approved' : 'scope:rejected';
  emitToProject(approval.scope.projectId, event, { approvalId: approval.id, scopeId: approval.scopeId });
  await notifyProjectMembers(approval.scope.projectId, { type: event.toUpperCase(), title: status === 'APPROVED' ? 'Scope approved' : 'Scope rejected', entityId: approval.id, entityType: 'Approval' });
  res.json({ data: updated });
}

export const approveApproval = (req: AuthedRequest, res: Response) => decide(req, res, 'APPROVED');
export const rejectApproval = (req: AuthedRequest, res: Response) => decide(req, res, 'REJECTED');
