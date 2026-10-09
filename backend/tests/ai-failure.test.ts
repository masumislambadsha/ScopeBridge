import { describe, it, expect, beforeAll } from "vitest";
import { authed, truncateAll, makeFixture, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";

/** AI failure → manual mode: FAILED runs, AI_FAILED submissions, PM notified, no crash. */
describe("ai failure handling", () => {
  let fx: Fixture;

  beforeAll(async () => {
    await truncateAll();
    fx = await makeFixture();
    process.env.MOCK_AI_FAIL = "1";
  });

  it("extraction final failure marks submission AI_FAILED + run FAILED", async () => {
    const pm = authed(fx.pm.token);
    let r = await pm.post("/api/information-requests").send({
      projectId: fx.projectId, title: "IR",
      questions: [{ id: "q1", question: "Q?", answerType: "text", required: true }],
    });
    const irId = r.body.data.id as string;
    await pm.post(`/api/information-requests/${irId}/send`);
    r = await authed(fx.clientUser.token).post("/api/submissions").send({
      projectId: fx.projectId, informationRequestId: irId, answers: { q1: "answer" },
    });
    expect(r.status).toBe(201);
    const subId = r.body.data.id as string;

    const run = await prisma.aiRun.findFirst({ where: { entityType: "Submission", entityId: subId }, orderBy: { createdAt: "desc" } });
    expect(run).toBeTruthy();

    const { processExtract } = await import("../src/workers/processors/ai.processor");
    // Non-final attempt throws (BullMQ would retry).
    await expect(processExtract({ data: { aiRunId: run!.id, submissionId: subId }, attemptsMade: 0, opts: { attempts: 3 } } as never)).rejects.toThrow();
    // Final attempt records failure + manual mode.
    await expect(processExtract({ data: { aiRunId: run!.id, submissionId: subId }, attemptsMade: 2, opts: { attempts: 3 } } as never)).rejects.toThrow();
    const failed = await prisma.aiRun.findUnique({ where: { id: run!.id } });
    expect(failed!.status).toBe("FAILED");
    const sub = await prisma.submission.findUnique({ where: { id: subId } });
    expect(sub!.status).toBe("AI_FAILED");
    // PM notified.
    const notif = await prisma.notification.findFirst({ where: { userId: fx.pm.id, type: "AI_FAILED" } });
    expect(notif).toBeTruthy();
  });

  it("AI never writes decision statuses (processors only write drafts/analysis)", async () => {
    const src = await import("fs").then((fs) => fs.readFileSync("src/workers/processors/ai.processor.ts", "utf8"));
    const writes = [...src.matchAll(/status:\s*"(APPROVED|REJECTED)"/g)].map((m) => m[1]);
    expect(writes).toEqual([]);
  });
});
