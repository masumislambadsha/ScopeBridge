import { prisma } from "../../lib/prisma";
import { notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";
import { Access } from "../../middleware/access";

export async function listNotifications(userId: string, q: { unread?: string; page: number; limit: number }) {
  const where = { userId, ...(q.unread === "1" ? { read: false } : {}) };
  const { page, limit, skip, take } = paginate(q);
  const [total, data, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);
  const { data: d, meta } = paged(data, total, page, limit);
  return { data: d, meta: { ...meta, unreadCount } };
}

export async function markRead(userId: string, id: string) {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.userId !== userId) throw notFound("Notification not found");
  return prisma.notification.update({ where: { id }, data: { read: true, readAt: new Date() } });
}

export async function markAllRead(userId: string) {
  const out = await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true, readAt: new Date() } });
  return { ok: true, count: out.count };
}

export async function listActivity(access: Access, q: { workspaceId?: string; projectId?: string; action?: string; entityType?: string; page: number; limit: number }) {
  let workspaceId = q.workspaceId;
  let projectWhere: Record<string, unknown> = {};
  if (q.projectId) {
    const project = await prisma.project.findUnique({ where: { id: q.projectId } });
    if (!project) throw notFound("Project not found");
    if (access.kind === "CLIENT") {
      if (project.clientId !== access.clientId) throw notFound("Project not found");
    } else if (project.workspaceId !== access.workspaceId) {
      throw notFound("Project not found");
    }
    workspaceId = project.workspaceId;
    projectWhere = { projectId: q.projectId };
    if (access.kind === "MEMBER" && access.role === "TEAM_MEMBER") {
      const pm = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: q.projectId, userId: access.userId } },
      });
      if (!pm) throw notFound("Project not found");
    }
  } else {
    if (!workspaceId) throw notFound("Workspace not found");
    if (access.kind === "CLIENT") throw notFound("Workspace not found");
    if (workspaceId !== access.workspaceId) throw notFound("Workspace not found");
  }
  const where = {
    workspaceId,
    ...projectWhere,
    ...(q.action ? { action: q.action } : {}),
    ...(q.entityType ? { entityType: q.entityType } : {}),
  };
  const { page, limit, skip, take } = paginate(q);
  const [total, data] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: { actor: { select: { id: true, name: true } } } }),
  ]);
  return paged(data, total, page, limit);
}
