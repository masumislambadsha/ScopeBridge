import { prisma } from "../../lib/prisma";
import { conflict, forbidden, notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";
import { audit } from "../../services/audit";

export const DEFAULT_SETTINGS = { reminderIntervalDays: 2, maxReminders: 3, deadlineWarningHours: 48 };

export function workspaceSettings(raw: unknown) {
  const base = { ...DEFAULT_SETTINGS, ...((raw ?? {}) as Record<string, unknown>) };
  return {
    reminderIntervalDays: Number(base.reminderIntervalDays) || DEFAULT_SETTINGS.reminderIntervalDays,
    maxReminders: Number(base.maxReminders ?? DEFAULT_SETTINGS.maxReminders),
    deadlineWarningHours: Number(base.deadlineWarningHours) || DEFAULT_SETTINGS.deadlineWarningHours,
  };
}

export async function createWorkspace(userId: string, input: { name: string; description?: string }) {
  const ws = await prisma.$transaction(async (tx) => {
    const w = await tx.workspace.create({ data: { name: input.name, description: input.description, ownerId: userId, settings: DEFAULT_SETTINGS } });
    await tx.workspaceMember.create({ data: { workspaceId: w.id, userId, role: "ADMIN" } });
    return w;
  });
  await audit({ workspaceId: ws.id, actorId: userId, action: "workspace.created", entityType: "Workspace", entityId: ws.id });
  return ws;
}

export async function listWorkspaces(userId: string, q: { page: number; limit: number }) {
  const memberships = await prisma.workspaceMember.findMany({ where: { userId }, include: { workspace: true } });
  const data = memberships.map((m) => ({ ...m.workspace, settings: workspaceSettings(m.workspace.settings), role: m.role }));
  const { page, limit } = paginate(q);
  return paged(data.slice((page - 1) * limit, page * limit), data.length, page, limit);
}

export async function getWorkspace(workspaceId: string) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) throw notFound("Workspace not found");
  return { ...ws, settings: workspaceSettings(ws.settings) };
}

export async function patchWorkspace(workspaceId: string, actorId: string, data: { name?: string; description?: string | null; settings?: Record<string, number> }) {
  const ws = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.settings !== undefined ? { settings: { ...DEFAULT_SETTINGS, ...data.settings } } : {}),
    },
  });
  await audit({ workspaceId, actorId, action: "workspace.updated", entityType: "Workspace", entityId: ws.id, metadata: { changed: Object.keys(data) } });
  return ws;
}

export async function deleteWorkspace(workspaceId: string) {
  await prisma.workspace.delete({ where: { id: workspaceId } });
  return { ok: true };
}

export async function listMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });
}

async function getMemberInWorkspace(workspaceId: string, memberId: string) {
  const member = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
  if (!member || member.workspaceId !== workspaceId) throw notFound("Member not found");
  return member;
}

async function ensureAdminRemains(workspaceId: string, excludeMemberId?: string) {
  const admins = await prisma.workspaceMember.count({
    where: { workspaceId, role: "ADMIN", ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}) },
  });
  if (admins < 1) throw conflict("At least one admin must remain in the workspace");
}

export async function addMemberByEmail(actorId: string, workspaceId: string, email: string, role: "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER") {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw notFound("User not found — they must register first");
  const member = await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    update: { role },
    create: { workspaceId, userId: user.id, role },
  });
  await audit({ workspaceId, actorId, action: "member.added", entityType: "WorkspaceMember", entityId: member.id, metadata: { email, role } });
  return member;
}

export async function patchMember(actorId: string, workspaceId: string, memberId: string, role: "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER") {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) throw notFound("Workspace not found");
  const member = await getMemberInWorkspace(workspaceId, memberId);
  if (member.userId === ws.ownerId && role !== "ADMIN") {
    throw forbidden("The workspace owner cannot be demoted");
  }
  if (member.role === "ADMIN" && role !== "ADMIN") {
    await ensureAdminRemains(workspaceId, member.id);
  }
  const updated = await prisma.workspaceMember.update({ where: { id: member.id }, data: { role } });
  await audit({ workspaceId, actorId, action: "member.role_changed", entityType: "WorkspaceMember", entityId: member.id, metadata: { from: member.role, to: role } });
  return updated;
}

export async function removeMember(actorId: string, workspaceId: string, memberId: string) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) throw notFound("Workspace not found");
  const member = await getMemberInWorkspace(workspaceId, memberId);
  if (member.userId === ws.ownerId) throw forbidden("The workspace owner cannot be removed");
  if (actorId === member.userId) throw forbidden("You cannot remove yourself; ask another admin");
  if (member.role === "ADMIN") await ensureAdminRemains(workspaceId, member.id);
  await prisma.workspaceMember.delete({ where: { id: member.id } });
  await audit({ workspaceId, actorId, action: "member.removed", entityType: "WorkspaceMember", entityId: member.id });
  return { ok: true };
}
