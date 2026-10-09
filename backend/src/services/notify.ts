import { prisma } from "../lib/prisma";
import { queueEmail, EmailTemplate } from "./mailer";
import { emitToUser, emitTeam, emitClient } from "./realtime";

export type NotifyEvent =
  | "ir.sent" | "submission.new" | "file.uploaded" | "requirement.updated"
  | "approval.requested" | "approval.decided" | "task.assigned" | "cr.submitted"
  | "cr.decided" | "deadline.approaching" | "ai.completed" | "ai.failed";

interface NotifyCtx {
  projectId: string;
  title: string;
  body?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  /** restricts CLIENT recipients to this client (defaults to the project's client) */
  clientId?: string;
  /** email template + data, when this event sends email (✉) */
  email?: { template: EmailTemplate; data: Record<string, string> };
  excludeUserId?: string;
}

async function agencyRecipients(projectId: string, roles?: Array<"ADMIN" | "PROJECT_MANAGER">) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
  if (!project) return { workspaceId: "", userIds: [] as string[] };
  const where = roles?.length
    ? { workspaceId: project.workspaceId, role: { in: roles } }
    : { workspaceId: project.workspaceId };
  const members = await prisma.workspaceMember.findMany({ where, select: { userId: true } });
  return { workspaceId: project.workspaceId, userIds: members.map((m) => m.userId) };
}

async function clientRecipient(projectId: string, clientId?: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientId: true, client: { select: { id: true, portalUserId: true, email: true } } },
  });
  if (!project) return null;
  if (clientId && clientId !== project.client.id) return null;
  return project.client.portalUserId ? { userId: project.client.portalUserId, email: project.client.email } : null;
}

export async function notifyUser(
  userId: string,
  n: { type: string; title: string; body?: string; link?: string; projectId?: string; entityId?: string; entityType?: string },
) {
  const row = await prisma.notification.create({ data: { userId, ...n } });
  await emitToUser(userId, "notification:new", row);
  return row;
}

/**
 * Central notify() with the FR-27 recipient matrix. Creates in-app notifications
 * (with link), emits realtime events, and queues email where marked ✉.
 */
export async function notify(event: NotifyEvent, ctx: NotifyCtx): Promise<void> {
  const base = {
    title: ctx.title,
    body: ctx.body,
    link: ctx.link,
    projectId: ctx.projectId,
    entityType: ctx.entityType,
    entityId: ctx.entityId,
  };
  const emailClient = async (email: string) => {
    if (ctx.email) await queueEmail(email, ctx.email.template, ctx.email.data);
  };

  switch (event) {
    case "ir.sent": {
      const c = await clientRecipient(ctx.projectId, ctx.clientId);
      if (!c) return;
      await notifyUser(c.userId, { ...base, type: "IR_SENT" });
      await emitClient(ctx.projectId, "notification:new", { type: "IR_SENT", ...base });
      await emailClient(c.email);
      return;
    }
    case "submission.new":
    case "file.uploaded":
    case "cr.submitted": {
      const { userIds } = await agencyRecipients(ctx.projectId, ["ADMIN", "PROJECT_MANAGER"]);
      const type = event === "submission.new" ? "SUBMISSION_NEW" : event === "file.uploaded" ? "FILE_UPLOADED" : "CR_NEW";
      for (const u of userIds) {
        if (u === ctx.excludeUserId) continue;
        await notifyUser(u, { ...base, type });
      }
      await emitTeam(ctx.projectId, "notification:new", { type, ...base });
      if (event === "submission.new") await emitTeam(ctx.projectId, "submission:new", { projectId: ctx.projectId, entityId: ctx.entityId });
      return;
    }
    case "requirement.updated": {
      const { userIds } = await agencyRecipients(ctx.projectId, ["ADMIN", "PROJECT_MANAGER"]);
      for (const u of userIds) {
        if (u === ctx.excludeUserId) continue;
        await notifyUser(u, { ...base, type: "REQUIREMENT_UPDATED" });
      }
      await emitTeam(ctx.projectId, "requirement:updated", { projectId: ctx.projectId, entityId: ctx.entityId });
      return;
    }
    case "approval.requested": {
      const c = await clientRecipient(ctx.projectId, ctx.clientId);
      if (!c) return;
      await notifyUser(c.userId, { ...base, type: "APPROVAL_REQUESTED" });
      await emitClient(ctx.projectId, "approval:updated", { projectId: ctx.projectId, entityId: ctx.entityId });
      await emailClient(c.email);
      return;
    }
    case "approval.decided": {
      const { userIds } = await agencyRecipients(ctx.projectId, ["ADMIN", "PROJECT_MANAGER"]);
      for (const u of userIds) {
        if (u === ctx.excludeUserId) continue;
        await notifyUser(u, { ...base, type: "APPROVAL_DECIDED" });
      }
      await emitTeam(ctx.projectId, "approval:updated", { projectId: ctx.projectId, entityId: ctx.entityId });
      await emitClient(ctx.projectId, "approval:updated", { projectId: ctx.projectId, entityId: ctx.entityId });
      const c = await clientRecipient(ctx.projectId, ctx.clientId);
      if (c && ctx.email) await queueEmail(c.email, ctx.email.template, ctx.email.data);
      return;
    }
    case "task.assigned": {
      if (!ctx.entityId) return;
      const task = await prisma.task.findUnique({ where: { id: ctx.entityId }, select: { assigneeId: true } });
      if (!task?.assigneeId) return;
      await notifyUser(task.assigneeId, { ...base, type: "TASK_ASSIGNED" });
      await emitTeam(ctx.projectId, "task:updated", { projectId: ctx.projectId, entityId: ctx.entityId });
      return;
    }
    case "cr.decided": {
      const { userIds } = await agencyRecipients(ctx.projectId, ["ADMIN", "PROJECT_MANAGER"]);
      for (const u of userIds) {
        if (u === ctx.excludeUserId) continue;
        await notifyUser(u, { ...base, type: "CR_DECIDED" });
      }
      await emitTeam(ctx.projectId, "change-request:updated", { projectId: ctx.projectId, entityId: ctx.entityId });
      await emitClient(ctx.projectId, "change-request:updated", { projectId: ctx.projectId, entityId: ctx.entityId });
      const c = await clientRecipient(ctx.projectId, ctx.clientId);
      if (c && ctx.email) await queueEmail(c.email, ctx.email.template, ctx.email.data);
      return;
    }
    case "deadline.approaching":
    case "ai.completed":
    case "ai.failed": {
      const { userIds } = await agencyRecipients(ctx.projectId, ["ADMIN", "PROJECT_MANAGER"]);
      const type = event === "deadline.approaching" ? "DEADLINE" : event === "ai.completed" ? "AI_DONE" : "AI_FAILED";
      for (const u of userIds) {
        if (u === ctx.excludeUserId) continue;
        await notifyUser(u, { ...base, type });
      }
      await emitTeam(ctx.projectId, "notification:new", { type, ...base });
      return;
    }
  }
}
