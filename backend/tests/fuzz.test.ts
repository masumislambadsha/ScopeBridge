import { describe, it, expect, beforeAll } from "vitest";
import { api, authed, registerUser, expectEnvelope, expectCode, truncateAll, FAKE_ID } from "./helpers";

/**
 * §2.2 D01: no request body may crash the API process.
 * Every probe asserts a well-formed §3.2 envelope; /health must stay 200 throughout.
 */
describe("fuzz: invalid bodies never crash the server", () => {
  let token = "";
  let selfId = "";

  beforeAll(async () => {
    await truncateAll();
    const u = await registerUser();
    token = u.token;
    selfId = u.id;
  });

  async function alive() {
    const res = await api.get("/health");
    expect(res.status).toBe(200);
  }

  it("unauthenticated probes get UNAUTHENTICATED (no crash)", async () => {
    const probes: Array<[string, string]> = [
      ["get", "/api/users"], ["get", `/api/users/${FAKE_ID}`], ["patch", `/api/users/${FAKE_ID}`],
      ["post", "/api/workspaces"], ["get", "/api/workspaces"], ["get", `/api/workspaces/${FAKE_ID}`],
      ["patch", `/api/workspaces/${FAKE_ID}`], ["delete", `/api/workspaces/${FAKE_ID}`],
      ["get", `/api/workspaces/${FAKE_ID}/members`], ["post", `/api/workspaces/${FAKE_ID}/members`],
      ["post", "/api/clients"], ["get", "/api/clients"], ["get", `/api/clients/${FAKE_ID}`],
      ["patch", `/api/clients/${FAKE_ID}`], ["delete", `/api/clients/${FAKE_ID}`],
      ["post", "/api/projects"], ["get", "/api/projects"], ["get", `/api/projects/${FAKE_ID}`],
      ["patch", `/api/projects/${FAKE_ID}`], ["delete", `/api/projects/${FAKE_ID}`],
      ["get", "/api/dashboard/analytics"], ["post", "/api/information-requests"], ["get", "/api/information-requests"],
      ["get", `/api/information-requests/${FAKE_ID}`], ["patch", `/api/information-requests/${FAKE_ID}`],
      ["post", "/api/submissions"], ["get", "/api/submissions"], ["get", `/api/submissions/${FAKE_ID}`],
      ["post", "/api/files"], ["get", "/api/files"],
      ["post", "/api/requirements"], ["get", "/api/requirements"], ["get", `/api/requirements/${FAKE_ID}`],
      ["patch", `/api/requirements/${FAKE_ID}`], ["delete", `/api/requirements/${FAKE_ID}`],
      ["post", "/api/scopes"], ["get", "/api/scopes"],
      ["get", `/api/scopes/${FAKE_ID}`],
      ["post", `/api/scopes/${FAKE_ID}/versions`], ["get", `/api/scopes/${FAKE_ID}/versions`],
      ["get", `/api/scope-versions/${FAKE_ID}`], ["patch", `/api/scope-versions/${FAKE_ID}`],
      ["post", `/api/scopes/${FAKE_ID}/request-approval`], ["post", "/api/approvals"], ["get", "/api/approvals"],
      ["get", `/api/approvals/${FAKE_ID}`],
      ["post", `/api/approvals/${FAKE_ID}/approve`], ["post", `/api/approvals/${FAKE_ID}/reject`],
      ["post", `/api/approvals/${FAKE_ID}/request-changes`],
      ["post", "/api/tasks"], ["get", "/api/tasks"], ["get", "/api/tasks/mine"], ["get", `/api/tasks/${FAKE_ID}`],
      ["patch", `/api/tasks/${FAKE_ID}`], ["delete", `/api/tasks/${FAKE_ID}`],
      ["post", `/api/projects/${FAKE_ID}/tasks/bulk`], ["post", "/api/change-requests"],
      ["get", "/api/change-requests"], ["get", `/api/change-requests/${FAKE_ID}`],
      ["patch", `/api/change-requests/${FAKE_ID}`], ["post", `/api/change-requests/${FAKE_ID}/analyze`],
      ["post", `/api/change-requests/${FAKE_ID}/approve`], ["post", `/api/change-requests/${FAKE_ID}/reject`],
      ["post", "/api/messages"], ["get", "/api/messages"], ["get", "/api/notifications"],
      ["patch", `/api/notifications/${FAKE_ID}/read`], ["patch", "/api/notifications/read-all"],
      ["get", "/api/activity"], ["get", `/api/portal/projects/${FAKE_ID}`],
      ["post", "/api/ai/checklist"], ["post", "/api/ai/extract"], ["post", "/api/ai/readiness"],
      ["post", "/api/ai/acceptance-criteria"], ["post", "/api/ai/scope-analysis"], ["get", `/api/ai/runs/${FAKE_ID}`],
    ];
    for (const [method, path] of probes) {
      const res = await (api as unknown as Record<string, (p: string) => { send: (b: unknown) => Promise<{ status: number; body: unknown }> }>)[method](path).send({});
      expect(res.status, path).toBe(401);
      expectCode(res, "UNAUTHENTICATED");
    }
    await alive();
  });

  it("public auth routes reject garbage with VALIDATION_ERROR", async () => {
    const bodies: unknown[] = [{}, { email: 123, password: null }, { email: "not-an-email", password: "short" }];
    for (const path of ["/api/auth/register", "/api/auth/login", "/api/auth/forgot-password", "/api/auth/reset-password"]) {
      for (const body of bodies) {
        const res = await api.post(path).send(body);
        expect([400, 401, 409]).toContain(res.status);
        if (res.status === 400) expectCode(res, "VALIDATION_ERROR");
        else expectEnvelope(res);
      }
    }
    await alive();
  });

  it("malformed JSON returns 400, not a crash", async () => {
    const res = await api.post("/api/auth/register").set("Content-Type", "application/json").send("not json{{{");
    expect(res.status).toBe(400);
    expectCode(res, "VALIDATION_ERROR");
    await alive();
  });

  it("authenticated garbage bodies return 400 VALIDATION_ERROR", async () => {
    const auth = authed(token);
    const cases: Array<{ m: "post" | "patch"; p: string; b: unknown }> = [
      { m: "post", p: "/api/workspaces", b: {} },
      { m: "post", p: "/api/workspaces", b: { name: 123 } },
      { m: "post", p: "/api/clients", b: {} },
      { m: "post", p: "/api/projects", b: { name: 1 } },
      { m: "post", p: "/api/information-requests", b: { title: 5 } },
      { m: "post", p: "/api/submissions", b: {} },
      { m: "post", p: "/api/requirements", b: { title: [] } },
      { m: "post", p: "/api/scopes", b: { features: "nope" } },
      { m: "post", p: "/api/approvals", b: {} },
      { m: "post", p: "/api/tasks", b: { title: 42 } },
      { m: "post", p: "/api/messages", b: { content: 7 } },
      { m: "post", p: "/api/change-requests", b: {} },
      { m: "post", p: "/api/ai/checklist", b: {} },
      { m: "post", p: "/api/ai/readiness", b: {} },
      { m: "post", p: "/api/ai/acceptance-criteria", b: { nope: 1 } },
      { m: "post", p: "/api/ai/scope-analysis", b: [] },
      { m: "patch", p: `/api/users/${selfId}`, b: { name: 123 } },
    ];
    for (const c of cases) {
      const res = await auth[c.m](c.p).send(c.b);
      expect(res.status, `${c.m} ${c.p}`).toBe(400);
      expectCode(res, "VALIDATION_ERROR");
    }
    await alive();
  });

  it("unknown ids return 403/404 envelopes (never leak, never crash)", async () => {
    const auth = authed(token);
    const cases: Array<{ m: "get" | "patch" | "delete" | "post"; p: string; b?: unknown }> = [
      { m: "get", p: `/api/workspaces/${FAKE_ID}` }, { m: "get", p: `/api/workspaces/${FAKE_ID}/members` },
      { m: "patch", p: `/api/workspaces/${FAKE_ID}/members/${FAKE_ID}`, b: { role: "ADMIN" } },
      { m: "get", p: `/api/clients/${FAKE_ID}` }, { m: "delete", p: `/api/clients/${FAKE_ID}` },
      { m: "get", p: `/api/projects/${FAKE_ID}` }, { m: "delete", p: `/api/projects/${FAKE_ID}` },
      { m: "get", p: `/api/tasks/${FAKE_ID}` }, { m: "get", p: `/api/change-requests/${FAKE_ID}` },
      { m: "get", p: `/api/submissions/${FAKE_ID}` }, { m: "get", p: `/api/scope-versions/${FAKE_ID}` },
      { m: "post", p: `/api/approvals/${FAKE_ID}/approve`, b: { signatureName: "X" } },
      { m: "post", p: `/api/change-requests/${FAKE_ID}/analyze` },
      { m: "patch", p: `/api/notifications/${FAKE_ID}/read` },
      { m: "get", p: `/api/portal/projects/${FAKE_ID}` },
    ];
    for (const c of cases) {
      const req = auth[c.m](c.p);
      const res = c.b ? await req.send(c.b) : await req;
      expect([400, 403, 404]).toContain(res.status);
      expectEnvelope(res);
    }
    await alive();
  });

  it("write path still works after all fuzzing (server alive)", async () => {
    const u = await registerUser();
    expect(u.token.length).toBeGreaterThan(10);
    const ws = await authed(u.token).post("/api/workspaces").send({ name: "Alive check" });
    expect(ws.status).toBe(201);
    expect(ws.body.success).toBe(true);
  });
});
