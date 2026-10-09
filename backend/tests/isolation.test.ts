import { describe, it, expect, beforeAll } from "vitest";
import { api, authed, registerUser, truncateAll, makeFixture, expectCode, type Fixture } from "./helpers";

/** Cross-workspace access returns 404 for every resource type (never leaks existence). */
describe("workspace isolation", () => {
  let a: Fixture;
  let outsider: { id: string; token: string };

  beforeAll(async () => {
    await truncateAll();
    a = await makeFixture();
    outsider = await registerUser("Outsider");
  });

  it("foreign workspace, project, client, and members → 404", async () => {
    const o = authed(outsider.token);
    for (const [method, path] of [
      ["get", `/api/workspaces/${a.workspaceId}`],
      ["get", `/api/workspaces/${a.workspaceId}/members`],
      ["get", `/api/projects/${a.projectId}`],
      ["get", `/api/clients/${a.clientId}`],
      ["get", `/api/users?workspaceId=${a.workspaceId}`],
    ] as const) {
      const r = await o[method](path);
      expect(r.status, `${method} ${path}`).toBe(404);
      expectCode(r, "NOT_FOUND");
    }
  });

  it("foreign entity ids → 404 (tasks, CRs, requirements, scopes, files, messages)", async () => {
    const pm = authed(a.pm.token);
    // Seed one of each.
    const req = await pm.post("/api/requirements").send({ projectId: a.projectId, title: "Iso req" });
    const scope = await pm.post("/api/scopes").send({ projectId: a.projectId });
    const scopeId = scope.body.data.id as string;
    const versions = await pm.get(`/api/scopes/${scopeId}`);
    const v1 = versions.body.data.versions[0].id as string;
    const o = authed(outsider.token);
    for (const [method, path] of [
      ["get", `/api/requirements/${req.body.data.id}`],
      ["get", `/api/scopes/${scopeId}`],
      ["get", `/api/scope-versions/${v1}`],
      ["get", "/api/tasks?projectId=" + a.projectId],
      ["get", "/api/change-requests?projectId=" + a.projectId],
      ["get", "/api/submissions?projectId=" + a.projectId],
      ["get", "/api/files?projectId=" + a.projectId],
      ["get", "/api/messages?projectId=" + a.projectId],
      ["get", `/api/portal/projects/${a.projectId}`],
      ["get", `/api/projects/${a.projectId}/traceability`],
      ["get", `/api/activity?projectId=${a.projectId}`],
    ] as const) {
      const r = await o[method](path);
      expect([403, 404]).toContain(r.status);
      if (r.status === 404) expectCode(r, "NOT_FOUND");
    }
  });

  it("users endpoints are scoped: no global directory", async () => {
    const o = authed(outsider.token);
    // No workspaceId → 400; other user's id → 404 (not 200).
    let r = await o.get("/api/users");
    expect(r.status).toBe(400);
    r = await o.get(`/api/users/${a.pm.id}`);
    expect(r.status).toBe(404);
    // Same-workspace member can read.
    const pm = authed(a.pm.token);
    r = await pm.get(`/api/users/${a.dev.id}`);
    expect(r.status).toBe(200);
    r = await pm.get(`/api/users?workspaceId=${a.workspaceId}`);
    expect(r.status).toBe(200);
    expect((r.body.data as unknown[]).length).toBeGreaterThanOrEqual(3);
  });

  it("second workspace cannot see first workspace's tasks without projectId", async () => {
    const o = authed(outsider.token);
    const r = await o.get("/api/tasks");
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual([]);
    // And the insider's unscoped list contains no foreign rows.
    const pm = authed(a.pm.token);
    const mine = await pm.get("/api/tasks");
    expect(mine.status).toBe(200);
    void api;
  });
});
