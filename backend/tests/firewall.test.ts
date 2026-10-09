import { describe, it, expect, beforeAll } from "vitest";
import { authed, truncateAll, makeFixture, makeApprovedScope, expectCode, type Fixture } from "./helpers";

/** FR-22 Change Request Firewall. */
describe("firewall", () => {
  let fx: Fixture;
  let approvedVersionId: string;

  beforeAll(async () => {
    await truncateAll();
    fx = await makeFixture();
    ({ versionId: approvedVersionId } = await makeApprovedScope(fx));
  });

  it("no task without an APPROVED scope version", async () => {
    const pm = authed(fx.pm.token);
    // Fresh draft version.
    let r = await pm.post(`/api/scopes/${(await pm.get(`/api/projects/${fx.projectId}`)).body.data.scope.id}/versions`).send({});
    expect(r.status).toBe(201);
    const draftId = r.body.data.id as string;
    r = await pm.post("/api/tasks").send({ projectId: fx.projectId, scopeVersionId: draftId, title: "Sneak" });
    expect(r.status).toBe(409);
    expectCode(r, "CONFLICT");
    // Unknown version → 400.
    r = await pm.post("/api/tasks").send({ projectId: fx.projectId, scopeVersionId: "cl000000000000000000000000", title: "Sneak" });
    expect(r.status).toBe(400);
  });

  it("no task from a PENDING or UNDER_REVIEW CR", async () => {
    const pm = authed(fx.pm.token);
    const client = authed(fx.clientUser.token);
    let r = await client.post("/api/change-requests").send({ projectId: fx.projectId, title: "Extra", description: "More stuff" });
    expect(r.status).toBe(201);
    const crId = r.body.data.id as string;
    r = await pm.post("/api/tasks").send({ projectId: fx.projectId, scopeVersionId: approvedVersionId, changeRequestId: crId, title: "Early" });
    expect(r.status).toBe(409);
    await pm.patch(`/api/change-requests/${crId}`).send({ status: "UNDER_REVIEW" });
    r = await pm.post("/api/tasks").send({ projectId: fx.projectId, scopeVersionId: approvedVersionId, changeRequestId: crId, title: "Early2" });
    expect(r.status).toBe(409);
    // Bulk path is guarded too.
    r = await pm.post(`/api/projects/${fx.projectId}/tasks/bulk`).send({ scopeVersionId: approvedVersionId, tasks: [{ title: "B", changeRequestId: crId }] });
    expect(r.status).toBe(409);
    // After IN_SCOPE approval (no new version), tasks may reference the CR.
    r = await pm.post(`/api/change-requests/${crId}/approve`).send({ finalClassification: "IN_SCOPE", createScopeVersion: false });
    expect(r.status).toBe(200);
    r = await pm.post("/api/tasks").send({ projectId: fx.projectId, scopeVersionId: approvedVersionId, changeRequestId: crId, title: "Now ok" });
    expect(r.status).toBe(201);
  });

  it("CR without an approved scope is rejected with guidance", async () => {
    const pm = authed(fx.pm.token);
    // New project with no scope at all.
    let r = await pm.post("/api/projects").send({ workspaceId: fx.workspaceId, clientId: fx.clientId, name: "Fresh" });
    const freshId = r.body.data.id as string;
    const client = authed(fx.clientUser.token);
    r = await client.post("/api/change-requests").send({ projectId: freshId, title: "T", description: "D" });
    expect(r.status).toBe(409);
    expect(r.body.error.message).toMatch(/information request/i);
  });
});
