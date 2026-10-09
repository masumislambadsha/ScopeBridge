import { Job } from "bullmq";
import { prisma } from "../../lib/prisma";
import { logger } from "../../core/logger";
import { workspaceSettings } from "../../modules/workspaces/workspaces.service";
import { audit } from "../../services/audit";
import { notify, notifyUser } from "../../services/notify";
import { queueEmail } from "../../services/mailer";

const DAY = 24 * 3600 * 1000;

export async function processReminders(_job: Job) {
  const workspaces = await prisma.workspace.findMany({ select: { id: true, settings: true } });
  for (const ws of workspaces) {
    const s = workspaceSettings(ws.settings);
    await remindInformationRequests(ws.id, s).catch((e) => logger.warn("[reminders] ir failed", { err: String(e) }));
    await remindApprovals(ws.id, s).catch((e) => logger.warn("[reminders] approvals failed", { err: String(e) }));
    await remindTasks(ws.id, s).catch((e) => logger.warn("[reminders] tasks failed", { err: String(e) }));
  }
}

async function remindInformationRequests(workspaceId: string, s: { reminderIntervalDays: number; maxReminders: number; deadlineWarningHours: number }) {
  const now = new Date();
  const intervalMs = s.reminderIntervalDays * DAY;
  const requests = await prisma.informationRequest.findMany({
    where: { status: "SENT", project: { workspaceId } },
    include: { project: { select: { id: true, name: true, clientId: true } } },
  });
  for (const r of requests) {
    const since = r.lastReminderAt ?? r.sentAt ?? r.createdAt;
    const intervalElapsed = now.getTime() - new Date(since).getTime() >= intervalMs;
    const deadlineSoon = r.deadline && new Date(r.deadline).getTime() - now.getTime() <= s.deadlineWarningHours * 3600 * 1000 && new Date(r.deadline).getTime() > now.getTime();
    const recentlyReminded = now.getTime() - new Date(since).getTime() < DAY;
    const should = (intervalElapsed && r.reminderCount < s.maxReminders) ||
      (deadlineSoon && r.reminderCount < s.maxReminders && !recentlyReminded);
    if (!should) continue;
    // Idempotency: bump counters in the same transaction BEFORE sending.
    const updated = await prisma.$transaction(async (tx) => {
      const fresh = await tx.informationRequest.findUnique({ where: { id: r.id } });
      if (!fresh || fresh.status !== "SENT" || fresh.reminderCount >= s.maxReminders) return null;
      return tx.informationRequest.update({
        where: { id: r.id },
        data: { reminderCount: { increment: 1 }, lastReminderAt: now },
      });
    });
    if (!updated) continue;
    const client = await prisma.client.findUnique({ where: { id: r.project.clientId } });
    await notify("ir.sent", {
      projectId: r.project.id, clientId: r.project.clientId,
      title: "Reminder: information request awaiting answers",
      body: `${r.title} — ${r.project.name}`,
      link: `/portal/projects/${r.project.id}/requests/${r.id}`,
      entityType: "InformationRequest", entityId: r.id,
      email: client ? { template: "reminder", data: { message: `Reminder: "${r.title}" still needs your answers.`, link: `/portal/projects/${r.project.id}/requests/${r.id}` } } : undefined,
    });
    await audit({ workspaceId, projectId: r.project.id, action: "reminder.sent", entityType: "InformationRequest", entityId: r.id, actorType: "SYSTEM" });
  }
}

async function remindApprovals(workspaceId: string, s: { reminderIntervalDays: number }) {
  const cutoff = new Date(Date.now() - s.reminderIntervalDays * DAY);
  const approvals = await prisma.approval.findMany({
    where: { status: "PENDING", createdAt: { lte: cutoff }, scope: { project: { workspaceId } } },
    include: { scopeVersion: { select: { version: true } }, scope: { select: { projectId: true, project: { select: { id: true, name: true } } } }, client: { select: { id: true, email: true, portalUserId: true } } },
  });
  for (const a of approvals) {
    // Idempotency: skip if reminded within the interval.
    const recent = await prisma.notification.findFirst({
      where: { type: "APPROVAL_REMINDER", entityId: a.id, createdAt: { gte: cutoff } },
    });
    if (recent) continue;
    if (a.client.portalUserId) {
      await notifyUser(a.client.portalUserId, {
        type: "APPROVAL_REMINDER", title: "Reminder: scope awaiting approval",
        body: `Version v${a.scopeVersion.version} of ${a.scope.project.name}`,
        link: `/portal/projects/${a.scope.projectId}/scope`,
        projectId: a.scope.projectId, entityType: "Approval", entityId: a.id,
      });
    }
    await queueEmail(a.client.email, "reminder", {
      message: `Reminder: scope v${a.scopeVersion.version} of ${a.scope.project.name} is awaiting your approval.`,
      link: `/portal/projects/${a.scope.projectId}/scope`,
    }).catch(() => undefined);
    await audit({ workspaceId, projectId: a.scope.projectId, action: "reminder.sent", entityType: "Approval", entityId: a.id, actorType: "SYSTEM" });
  }
}

async function remindTasks(workspaceId: string, s: { deadlineWarningHours: number }) {
  const horizon = new Date(Date.now() + s.deadlineWarningHours * 3600 * 1000);
  const tasks = await prisma.task.findMany({
    where: {
      project: { workspaceId }, status: { not: "COMPLETED" },
      deadline: { lte: horizon, gte: new Date() }, deadlineNotifiedAt: null,
      assigneeId: { not: null },
    },
    include: { assignee: { select: { id: true, email: true } } },
  });
  for (const t of tasks) {
    const updated = await prisma.$transaction(async (tx) => {
      const fresh = await tx.task.findUnique({ where: { id: t.id } });
      if (!fresh || fresh.deadlineNotifiedAt || fresh.status === "COMPLETED") return null;
      return tx.task.update({ where: { id: t.id }, data: { deadlineNotifiedAt: new Date() } });
    });
    if (!updated || !t.assignee) continue;
    await notifyUser(t.assignee.id, {
      type: "DEADLINE", title: "Deadline approaching", body: `${t.code} — ${t.title}`,
      link: `/tasks`, projectId: t.projectId, entityType: "Task", entityId: t.id,
    });
    await queueEmail(t.assignee.email, "reminder", { message: `Deadline approaching: ${t.code} — ${t.title}`, link: "/tasks" }).catch(() => undefined);
    await audit({ workspaceId, projectId: t.projectId, action: "reminder.sent", entityType: "Task", entityId: t.id, actorType: "SYSTEM" });
  }
}
