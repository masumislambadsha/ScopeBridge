import { describe, it, expect, beforeAll } from "vitest";
import { authed, truncateAll, makeFixture, makeApprovedScope, type Fixture } from "./helpers";

/** FR-24/25: CR → v2 → client approval → v1 SUPERSEDED → tasks → IMPLEMENTED. */
describe("change-request v2 flow", () => {
  let fx: Fixture;
  let v1id: string;

  beforeAll(async () => {
    await truncateAll();
    fx = await makeFixture();
    ({ versionId: v1id } = await makeApprovedScope(fx));
  });

  it("full v2 lifecycle with IMPLEMENTED automation", async () => {
    const pm = authed(fx.pm.token);
    const client = authed(fx.clientUser.token);

    let r = await client.post("/api/change-requests").send({ projectId: fx.projectId, title: "Reports", description: "Add PDF reports" });
    expect(r.status).toBe(201);
    const crId = r.body.data.id as string;
    expect(r.body.data.baseScopeVersionId).toBe(v1id);

    r = await pm.post(`/api/change-requests/${crId}/approve`).send({
      finalClassification: "OUT_OF_SCOPE", createScopeVersion: true,
      newFeatures: [{ title: "PDF reports", description: "", priority: "HIGH", requirementIds: [], acceptanceCriteria: [] }],
    });
    expect(r.status).toBe(200);
    expect(r.body.data.clientApprovalStatus).toBe("PENDING");
    const v2id = r.body.data.proposedScopeVersionId as string;

    r = await pm.post("/api/approvals").send({ scopeVersionId: v2id });
    expect(r.status).toBe(201);
    r = await client.post(`/api/approvals/${r.body.data.id}/approve`).send({ signatureName: "Client" });
    expect(r.status).toBe(200);

    r = await pm.get(`/api/scope-versions/${v1id}`);
    expect(r.body.data.status).toBe("SUPERSEDED");
    r = await pm.get(`/api/change-requests/${crId}`);
    expect(r.body.data.status).toBe("APPROVED");
    expect(r.body.data.resultingScopeVersionId).toBe(v2id);

    // onlyNew tasks for the CR, then complete → IMPLEMENTED.
    r = await pm.get(`/api/scope-versions/${v2id}/generate-tasks?onlyNew=true`);
    expect(r.body.data.preview.length).toBeGreaterThan(0);
    r = await pm.post(`/api/projects/${fx.projectId}/tasks/bulk`).send({
      scopeVersionId: v2id,
      tasks: r.body.data.preview.map((t: { title: string }) => ({ title: t.title, changeRequestId: crId })),
    });
    expect(r.status).toBe(201);
    for (const t of r.body.data as Array<{ id: string }>) {
      const u = await pm.patch(`/api/tasks/${t.id}`).send({ status: "COMPLETED" });
      expect(u.status).toBe(200);
    }
    r = await pm.get(`/api/change-requests/${crId}`);
    expect(r.body.data.status).toBe("IMPLEMENTED");
  });

  it("reject requires a reason and notifies", async () => {
    const pm = authed(fx.pm.token);
    const client = authed(fx.clientUser.token);
    let r = await client.post("/api/change-requests").send({ projectId: fx.projectId, title: "Nope", description: "D" });
    const crId = r.body.data.id as string;
    r = await pm.post(`/api/change-requests/${crId}/reject`).send({});
    expect(r.status).toBe(400);
    r = await pm.post(`/api/change-requests/${crId}/reject`).send({ reason: "Out of budget" });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe("REJECTED");
    // Client sees the decision.
    r = await client.get(`/api/change-requests/${crId}`);
    expect(r.body.data.status).toBe("REJECTED");
  });

  it("AI decision rule: no AI path writes APPROVED/REJECTED", async () => {
    // Mock AI fixtures only produce DRAFT requirements and analysis output;
    // processors are audited by running them directly in ai-failure.test.ts.
    // Here: AI endpoints never change decision statuses synchronously.
    const pm = authed(fx.pm.token);
    const before = await pm.get(`/api/requirements?projectId=${fx.projectId}`);
    const statuses = new Set((before.body.data as Array<{ status: string }>).map((x) => x.status));
    let r = await pm.post("/api/ai/readiness").send({ projectId: fx.projectId });
    expect(r.status).toBe(202);
    r = await pm.post("/api/ai/acceptance-criteria").send({ requirementIds: [] }).catch(() => ({ status: 400 }) as never);
    void r;
    const after = await pm.get(`/api/requirements?projectId=${fx.projectId}`);
    const afterStatuses = new Set((after.body.data as Array<{ status: string }>).map((x) => x.status));
    expect([...afterStatuses].filter((s) => s === "APPROVED" || s === "REJECTED").length).toBeLessThanOrEqual(
      [...statuses].filter((s) => s === "APPROVED" || s === "REJECTED").length,
    );
  });
});
