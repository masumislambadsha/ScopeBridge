import { describe, it, expect, beforeAll } from "vitest";
import { authed, truncateAll, makeFixture, makeApprovedScope, expectCode, type Fixture } from "./helpers";

/** §3.4 permission matrix, swept per role. */
describe("rbac matrix", () => {
  let fx: Fixture;

  beforeAll(async () => {
    await truncateAll();
    fx = await makeFixture();
  });

  it("TEAM_MEMBER cannot delete projects, create clients, or review CRs", async () => {
    const dev = authed(fx.dev.token);
    let r = await dev.delete(`/api/projects/${fx.projectId}`);
    expect(r.status).toBe(403);
    r = await dev.post("/api/clients").send({ workspaceId: fx.workspaceId, name: "X", email: "x@y.zz" });
    expect(r.status).toBe(403);
    r = await dev.post("/api/change-requests").send({ projectId: fx.projectId, title: "T", description: "D" });
    expect([403, 409]).toContain(r.status);
    r = await dev.post("/api/tasks").send({ projectId: fx.projectId, scopeVersionId: "x", title: "T" });
    expect(r.status).toBe(403);
  });

  it("TEAM_MEMBER can move own tasks to REVIEW but not COMPLETED", async () => {
    const { versionId } = await makeApprovedScope(fx);
    const pm = authed(fx.pm.token);
    let r = await pm.post("/api/tasks").send({ projectId: fx.projectId, scopeVersionId: versionId, title: "Dev task", assigneeId: fx.dev.id });
    expect(r.status).toBe(201);
    const taskId = r.body.data.id as string;
    const dev = authed(fx.dev.token);
    r = await dev.patch(`/api/tasks/${taskId}`).send({ status: "REVIEW" });
    expect(r.status).toBe(200);
    r = await dev.patch(`/api/tasks/${taskId}`).send({ status: "COMPLETED" });
    expect(r.status).toBe(403);
    // ...and cannot touch others' tasks
    r = await pm.post("/api/tasks").send({ projectId: fx.projectId, scopeVersionId: versionId, title: "PM task", assigneeId: fx.pm.id });
    const other = r.body.data.id as string;
    r = await dev.patch(`/api/tasks/${other}`).send({ status: "IN_PROGRESS" });
    expect(r.status).toBe(403);
  });

  it("CLIENT can decide own approvals but nothing else", async () => {
    const client = authed(fx.clientUser.token);
    // Client-only users hold no workspace membership → 404 (never leak).
    let r = await client.post("/api/projects").send({ workspaceId: fx.workspaceId, clientId: fx.clientId, name: "Nope" });
    expect(r.status).toBe(404);
    r = await client.post("/api/tasks").send({ projectId: fx.projectId, scopeVersionId: "x", title: "T" });
    expect(r.status).toBe(403);
    r = await client.get("/api/tasks");
    expect(r.status).toBe(403);
    // Sees progress only via portal
    r = await client.get(`/api/portal/projects/${fx.projectId}`);
    expect(r.status).toBe(200);
    expect(r.body.data.progress).toBeDefined();
  });

  it("owner cannot be demoted/removed; last admin is protected", async () => {
    const admin = authed(fx.admin.token);
    const members = await admin.get(`/api/workspaces/${fx.workspaceId}/members`);
    const owner = (members.body.data as Array<{ id: string; user: { email: string }; role: string }>).find((m) => m.role === "ADMIN")!;
    let r = await admin.patch(`/api/workspaces/${fx.workspaceId}/members/${owner.id}`).send({ role: "TEAM_MEMBER" });
    // Either the owner (403) or, if it was the second admin path, conflict rules apply.
    expect([403, 409]).toContain(r.status);
    r = await admin.delete(`/api/workspaces/${fx.workspaceId}/members/${owner.id}`);
    expect([403, 409]).toContain(r.status);
  });

  it("PM can manage projects/clients but not workspace settings or members", async () => {
    const pm = authed(fx.pm.token);
    let r = await pm.patch(`/api/workspaces/${fx.workspaceId}`).send({ name: "Hijack" });
    expect(r.status).toBe(403);
    r = await pm.post(`/api/workspaces/${fx.workspaceId}/members`).send({ email: "z@z.zz", role: "TEAM_MEMBER" });
    expect(r.status).toBe(403);
    r = await pm.post("/api/projects").send({ workspaceId: fx.workspaceId, clientId: fx.clientId, name: "PM project" });
    expect(r.status).toBe(201);
  });

  it("memberId must belong to the workspace in the URL", async () => {
    const admin = authed(fx.admin.token);
    // Random id that is not a member of this workspace → 404, never acts cross-workspace.
    const r = await admin.patch(`/api/workspaces/${fx.workspaceId}/members/cl000000000000000000000000`).send({ role: "ADMIN" });
    expect(r.status).toBe(404);
    expectCode(r, "NOT_FOUND");
  });
});
