import { describe, it, expect, beforeAll } from "vitest";
import { authed, truncateAll, makeFixture, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";

/** FR-28: reminders are idempotent and SYSTEM-audited. */
describe("reminders", () => {
  let fx: Fixture;

  beforeAll(async () => {
    await truncateAll();
    fx = await makeFixture();
  });

  it("SENT IR past the interval is reminded once (counter-gated)", async () => {
    const pm = authed(fx.pm.token);
    let r = await pm.post("/api/information-requests").send({
      projectId: fx.projectId, title: "Old IR",
      questions: [{ id: "q1", question: "Q?", answerType: "text", required: true }],
    });
    const irId = r.body.data.id as string;
    await pm.post(`/api/information-requests/${irId}/send`);
    // Age it beyond the default 2-day interval.
    await prisma.informationRequest.update({
      where: { id: irId },
      data: { sentAt: new Date(Date.now() - 5 * 24 * 3600 * 1000), lastReminderAt: new Date(Date.now() - 5 * 24 * 3600 * 1000), reminderCount: 0 },
    });
    const { processReminders } = await import("../src/workers/processors/reminders.processor");
    await processReminders({} as never);
    await processReminders({} as never); // second run must not double-send
    const ir = await prisma.informationRequest.findUnique({ where: { id: irId } });
    expect(ir!.reminderCount).toBe(1);
    const notes = await prisma.notification.findMany({ where: { entityId: irId, type: "IR_SENT" } });
    expect(notes.length).toBe(1);
    const audits = await prisma.activityLog.findMany({ where: { entityId: irId, action: "reminder.sent" } });
    expect(audits.length).toBe(1);
    expect(audits[0].actorType).toBe("SYSTEM");
  });

  it("task deadline warnings fire once per task", async () => {
    const { versionId } = await (await import("./helpers")).makeApprovedScope(fx);
    const pm = authed(fx.pm.token);
    let r = await pm.post("/api/tasks").send({
      projectId: fx.projectId, scopeVersionId: versionId, title: "Urgent",
      assigneeId: fx.dev.id, deadline: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
    const taskId = r.body.data.id as string;
    const { processReminders } = await import("../src/workers/processors/reminders.processor");
    await processReminders({} as never);
    await processReminders({} as never);
    const t = await prisma.task.findUnique({ where: { id: taskId } });
    expect(t!.deadlineNotifiedAt).toBeTruthy();
    const notes = await prisma.notification.findMany({ where: { entityId: taskId, type: "DEADLINE" } });
    expect(notes.length).toBe(1);
  });
});
