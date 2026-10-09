import { prisma } from "../../lib/prisma";
import { AppError, forbidden, notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";
import { Access } from "../../middleware/access";
import { messageDTO, senderDTO } from "../../core/dto";
import { emitTeam, emitClient } from "../../services/realtime";
import { notify } from "../../services/notify";

export async function createMessage(access: Access, actorId: string, input: { projectId: string; content: string; visibility: "CLIENT" | "INTERNAL" }) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  if (access.kind === "CLIENT") {
    if (project.clientId !== access.clientId) throw notFound("Project not found");
    if (input.visibility !== "CLIENT") throw new AppError("VALIDATION_ERROR", "Clients can only send client-visible messages");
  }
  const msg = await prisma.message.create({
    data: { projectId: input.projectId, senderId: actorId, content: input.content, visibility: input.visibility },
    include: { sender: { select: { id: true, name: true } } },
  });
  const dto = messageDTO({ ...msg, sender: senderDTO(msg.sender as unknown as Record<string, unknown>) });
  if (input.visibility === "CLIENT") {
    await emitTeam(input.projectId, "message:new", dto);
    await emitClient(input.projectId, "message:new", dto);
  } else {
    await emitTeam(input.projectId, "message:new", dto);
  }
  // Recipient notifications (powers the unread indicator).
  if (access.kind === "CLIENT") {
    await notify("requirement.updated", {
      projectId: input.projectId, title: "New client message", body: input.content.slice(0, 140),
      link: `/projects/${input.projectId}`, entityType: "Message", entityId: msg.id, excludeUserId: actorId,
    });
  } else {
    const client = await prisma.client.findUnique({ where: { id: project.clientId }, select: { portalUserId: true } });
    if (client?.portalUserId && input.visibility === "CLIENT") {
      const { notifyUser } = await import("../../services/notify");
      await notifyUser(client.portalUserId, {
        type: "MESSAGE_NEW", title: "New message from your agency", body: input.content.slice(0, 140),
        link: `/portal/projects/${input.projectId}/messages`, projectId: input.projectId,
        entityType: "Message", entityId: msg.id,
      });
      await emitClient(input.projectId, "notification:new", { type: "MESSAGE_NEW", title: "New message" });
    }
  }
  return dto;
}

export async function listMessages(access: Access, projectId: string, q: { before?: string; page: number; limit: number }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  if (access.kind === "CLIENT" && project.clientId !== access.clientId) throw notFound("Project not found");
  if (access.kind !== "MEMBER" && access.kind !== "CLIENT") throw forbidden("Insufficient permission");
  const where = {
    projectId,
    ...(access.kind === "CLIENT" ? { visibility: "CLIENT" as const } : {}),
    ...(q.before ? { createdAt: { lt: new Date(q.before) } } : {}),
  };
  const { page, limit, skip, take } = paginate(q);
  const [total, data] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where, skip, take, orderBy: { createdAt: "desc" },
      include: { sender: { select: { id: true, name: true } } },
    }),
  ]);
  return paged(
    data.map((m) => messageDTO({ ...m, sender: senderDTO(m.sender as unknown as Record<string, unknown>) })),
    total, page, limit,
  );
}
