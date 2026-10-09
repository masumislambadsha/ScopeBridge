import { prisma } from "../../lib/prisma";
import { forbidden, notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";

/** GET /api/users requires workspaceId; returns members of a workspace the requester belongs to. */
export async function listUsers(requesterId: string, q: { workspaceId: string; search?: string; page: number; limit: number }) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: q.workspaceId, userId: requesterId } },
  });
  if (!membership) throw notFound("Workspace not found");
  const search = q.search?.trim();
  const where = {
    workspaceId: q.workspaceId,
    ...(search ? { user: { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] } } : {}),
  };
  const { page, limit, skip, take } = paginate(q);
  const [total, rows] = await Promise.all([
    prisma.workspaceMember.count({ where }),
    prisma.workspaceMember.findMany({
      where, skip, take,
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    }),
  ]);
  return paged(rows.map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt })), total, page, limit);
}

/** Only yourself or someone sharing a workspace with you. */
export async function getUser(requesterId: string, id: string) {
  if (requesterId === id) {
    const self = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, createdAt: true } });
    if (!self) throw notFound("User not found");
    return self;
  }
  const mine = await prisma.workspaceMember.findMany({ where: { userId: requesterId }, select: { workspaceId: true } });
  const mineIds = new Set(mine.map((m) => m.workspaceId));
  if (!mineIds.size) throw notFound("User not found");
  const theirs = await prisma.workspaceMember.findFirst({ where: { userId: id, workspaceId: { in: [...mineIds] } } });
  if (!theirs) throw notFound("User not found");
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, createdAt: true } });
  if (!user) throw notFound("User not found");
  return user;
}

export async function patchUser(requesterId: string, id: string, data: { name: string }) {
  if (requesterId !== id) throw forbidden("You can only edit your own profile");
  return prisma.user.update({ where: { id }, data, select: { id: true, name: true, email: true } });
}
