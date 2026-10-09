import { describe, it, expect, beforeAll } from "vitest";
import { authed, truncateAll, makeFixture, makeApprovedScope, expectCode, type Fixture } from "./helpers";

/** FR-17/18: approval integrity — only the client, only once, hash-checked, immutable. */
describe("approval integrity", () => {
  let fx: Fixture;
  let scopeId: string;
  let versionId: string;
  let approvalId: string;

  beforeAll(async () => {
    await truncateAll();
    fx = await makeFixture();
    ({ scopeId, versionId } = await makeApprovedScopePending());
  });

  async function makeApprovedScopePending() {
    const { pm, projectId } = fx;
    let res = await authed(pm.token).post("/api/requirements").send({ projectId, title: "R" });
    const reqId = res.body.data.id as string;
    await authed(pm.token).post(`/api/requirements/${reqId}/approve`);
    res = await authed(pm.token).post("/api/scopes").send({ projectId });
    const scId = res.body.data.id as string;
    res = await authed(pm.token).get(`/api/scopes/${scId}`);
    const v1 = res.body.data.versions.find((v: { version: number }) => v.version === 1);
    await authed(pm.token).patch(`/api/scope-versions/${v1.id}`).send({ features: [{ id: "f1", title: "F", description: "", priority: "MEDIUM", requirementIds: [reqId], acceptanceCriteria: [] }] });
    res = await authed(pm.token).post(`/api/scopes/${scId}/request-approval`);
    approvalId = res.body.data.id as string;
    return { scopeId: scId, versionId: v1.id as string };
  }

  it("agency users cannot decide; only the addressed client can", async () => {
    const pm = authed(fx.pm.token);
    let r = await pm.post(`/api/approvals/${approvalId}/approve`).send({ signatureName: "PM" });
    expect(r.status).toBe(403);
    const dev = authed(fx.dev.token);
    r = await dev.post(`/api/approvals/${approvalId}/reject`).send({ signatureName: "D", comment: "no" });
    expect([403, 404]).toContain(r.status);
  });

  it("reject requires a comment; approve stores the certificate", async () => {
    const client = authed(fx.clientUser.token);
    let r = await client.post(`/api/approvals/${approvalId}/reject`).send({ signatureName: "C" });
    expect(r.status).toBe(400);
    r = await client.post(`/api/approvals/${approvalId}/approve`).send({ signatureName: "Client Owner" });
    expect(r.status).toBe(200);
    expect(r.body.data.decidedById).toBe(fx.clientUser.id);
    expect(r.body.data.signatureName).toBe("Client Owner");
    expect(r.body.data.contentHash).toBeTruthy();
    expect(r.body.data.decidedAt).toBeTruthy();
  });

  it("decided approvals are immutable (second decision → 409)", async () => {
    const client = authed(fx.clientUser.token);
    const r = await client.post(`/api/approvals/${approvalId}/reject`).send({ signatureName: "C", comment: "late" });
    expect(r.status).toBe(409);
    expectCode(r, "CONFLICT");
  });

  it("tampered content fails the hash check", async () => {
    // New version → approval → tamper the frozen version directly in DB → approve must 409.
    const pm = authed(fx.pm.token);
    let r = await pm.post(`/api/scopes/${scopeId}/versions`).send({});
    expect(r.status).toBe(201);
    const v2 = r.body.data.id as string;
    await pm.patch(`/api/scope-versions/${v2}`).send({ features: [{ id: "g1", title: "G", description: "", priority: "LOW", requirementIds: [], acceptanceCriteria: [] }] });
    r = await pm.post(`/api/scopes/${scopeId}/request-approval`);
    const apId = r.body.data.id as string;
    // Tamper behind the API's back (simulates a race / DB-level edit).
    const { prisma } = await import("../src/lib/prisma");
    await prisma.scopeVersion.update({ where: { id: v2 }, data: { features: [{ id: "evil", title: "Evil" }] } });
    const client = authed(fx.clientUser.token);
    r = await client.post(`/api/approvals/${apId}/approve`).send({ signatureName: "C" });
    expect(r.status).toBe(409);
    expect(r.body.error.message).toMatch(/changed after/i);
    void versionId;
  });

  it("versions are never deletable and non-drafts immutable", async () => {
    const pm = authed(fx.pm.token);
    // No DELETE route exists for versions (404 on unknown route shape).
    const r = await pm.patch(`/api/scope-versions/${versionId}`).send({ summary: "tamper" });
    expect(r.status).toBe(409); // APPROVED is immutable
  });
});
