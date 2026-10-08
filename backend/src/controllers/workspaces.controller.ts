import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from '../middleware/auth';
import { paginate, paged } from '../utils/pagination';
import { logActivity } from '../services/notify';

const createSchema = z.object({ name: z.string().min(1), description: z.string().optional() });
const patchSchema = z.object({ name: z.string().min(1).optional(), description: z.string().nullable().optional() });
const memberAddSchema = z.object({ email: z.string().email(), role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER']).default('TEAM_MEMBER') });
const memberPatchSchema = z.object({ role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER']) });

export async function createWorkspace(req: AuthedRequest, res: Response) {
  const { name, description } = createSchema.parse(req.body);
  const ws = await prisma.$transaction(async (tx: any) => {
    const w = await tx.workspace.create({ data: { name, description, ownerId: req.userId! } });
    await tx.workspaceMember.create({ data: { workspaceId: w.id, userId: req.userId!, role: 'ADMIN' } });
    return w;
  });
  await logActivity({ workspaceId: ws.id, actorId: req.userId!, action: 'workspace.created', entityType: 'Workspace', entityId: ws.id });
  res.status(201).json({ data: ws });
}

export async function listWorkspaces(req: AuthedRequest, res: Response) {
  const { page, limit } = paginate(req.query);
  const memberships = await prisma.workspaceMember.findMany({ where: { userId: req.userId! }, include: { workspace: true } });
  const data = memberships.map((m: any) => ({ ...m.workspace, role: m.role }));
  res.json(paged(data.slice((page - 1) * limit, page * limit), data.length, page, limit));
}

export async function getWorkspace(req: AuthedRequest, res: Response) {
  const ws = await prisma.workspace.findUnique({ where: { id: req.params.id } });
  if (!ws) return res.status(404).json({ error: 'NotFound', message: 'Workspace not found' });
  const m = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: ws.id, userId: req.userId! } } });
  if (!m) return res.status(403).json({ error: 'Forbidden', message: 'Not a member' });
  res.json({ data: { ...ws, role: m.role } });
}

export async function patchWorkspace(req: AuthedRequest, res: Response) {
  const data = patchSchema.parse(req.body);
  const ws = await prisma.workspace.update({ where: { id: req.params.id }, data });
  res.json({ data: ws });
}

export async function deleteWorkspace(req: AuthedRequest, res: Response) {
  await prisma.workspace.delete({ where: { id: req.params.id } });
  res.json({ data: { ok: true } });
}

export async function addMember(req: AuthedRequest, res: Response) {
  const { email, role } = memberAddSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'NotFound', message: 'User not found — they must register first' });
  const member = await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: req.params.id, userId: user.id } },
    update: { role: role as any },
    create: { workspaceId: req.params.id, userId: user.id, role: role as any },
  });
  res.status(201).json({ data: member });
}

export async function listMembers(req: AuthedRequest, res: Response) {
  const members = await prisma.workspaceMember.findMany({ where: { workspaceId: req.params.id }, include: { user: { select: { id: true, name: true, email: true } } } });
  res.json({ data: members });
}

export async function patchMember(req: AuthedRequest, res: Response) {
  const { role } = memberPatchSchema.parse(req.body);
  const member = await prisma.workspaceMember.update({ where: { id: req.params.memberId }, data: { role: role as any } });
  res.json({ data: member });
}

export async function removeMember(req: AuthedRequest, res: Response) {
  await prisma.workspaceMember.delete({ where: { id: req.params.memberId } });
  res.json({ data: { ok: true } });
}
