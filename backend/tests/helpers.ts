import request from "supertest";
import { buildApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

export const app = buildApp();
export const api = request(app);

export const FAKE_ID = "cl000000000000000000000000";

let counter = 0;
export function uniqueEmail(prefix: string) {
  counter += 1;
  return `${prefix}${Date.now()}${counter}@example.com`;
}

export async function registerUser(name = "User") {
  const email = uniqueEmail("u");
  const res = await api.post("/api/auth/register").send({ name, email, password: "password123" });
  if (res.status !== 201) throw new Error(`setup register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: res.body.data.id as string, email, token: res.body.data.accessToken as string };
}

export function authed(token: string) {
  return {
    get: (p: string) => api.get(p).set("Authorization", `Bearer ${token}`),
    post: (p: string) => api.post(p).set("Authorization", `Bearer ${token}`),
    patch: (p: string) => api.patch(p).set("Authorization", `Bearer ${token}`),
    delete: (p: string) => api.delete(p).set("Authorization", `Bearer ${token}`),
  };
}

/** Every response must use the spec §3.2 envelope. */
export function expectEnvelope(res: { body: unknown }) {
  const body = res.body as { success?: unknown; error?: { code?: unknown } };
  expect(typeof body.success).toBe("boolean");
  if (body.success === false) {
    expect(typeof body.error?.code).toBe("string");
  }
}

export function expectCode(res: { body: unknown }, code: string) {
  expectEnvelope(res);
  expect((res.body as { error: { code: string } }).error.code).toBe(code);
}

const TABLES = [
  "PasswordResetToken", "ActivityLog", "Notification", "Message", "ChangeRequest",
  "Task", "Approval", "ScopeVersionRequirement", "ScopeVersion", "Scope",
  "Requirement", "ReadinessReport", "AiRun", "File", "Submission",
  "InformationRequest", "Invitation", "ProjectMember", "Project",
  "Client", "WorkspaceMember", "Workspace", "User",
];

export async function truncateAll() {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
}

export interface Fixture {
  admin: { id: string; email: string; token: string };
  pm: { id: string; email: string; token: string };
  dev: { id: string; email: string; token: string };
  clientUser: { id: string; email: string; token: string };
  workspaceId: string;
  clientId: string;
  projectId: string;
}

/** Full agency+client fixture: workspace, members, client+portal, project. */
export async function makeFixture(): Promise<Fixture> {
  const admin = await registerUser("Admin");
  let res = await authed(admin.token).post("/api/workspaces").send({ name: "Acme Agency" });
  if (res.status !== 201) throw new Error(`workspace: ${JSON.stringify(res.body)}`);
  const workspaceId = res.body.data.id as string;

  const pm = await registerUser("PM");
  const dev = await registerUser("Dev");
  for (const [u, role] of [[pm, "PROJECT_MANAGER"], [dev, "TEAM_MEMBER"]] as const) {
    res = await authed(admin.token).post(`/api/workspaces/${workspaceId}/members`).send({ email: u.email, role });
    if (res.status !== 201) throw new Error(`addMember: ${JSON.stringify(res.body)}`);
  }

  const clientEmail = uniqueEmail("client");
  res = await authed(pm.token).post("/api/clients").send({ workspaceId, name: "Client Co", email: clientEmail });
  if (res.status !== 201) throw new Error(`client: ${JSON.stringify(res.body)}`);
  const clientId = res.body.data.id as string;

  res = await authed(pm.token).post(`/api/clients/${clientId}/portal-invite`);
  if (res.status !== 201) throw new Error(`portal-invite: ${JSON.stringify(res.body)}`);
  const inviteToken = (res.body.data.link as string).split("/").pop()!;

  const reg = await api.post("/api/auth/register").send({ name: "Client", email: clientEmail, password: "password123", inviteToken });
  if (reg.status !== 201) throw new Error(`client register: ${JSON.stringify(reg.body)}`);
  const clientUser = { id: reg.body.data.id as string, email: clientEmail, token: reg.body.data.accessToken as string };

  res = await authed(pm.token).post("/api/projects").send({ workspaceId, clientId, name: "Website", projectType: "WEBSITE" });
  if (res.status !== 201) throw new Error(`project: ${JSON.stringify(res.body)}`);
  const projectId = res.body.data.id as string;

  res = await authed(pm.token).post(`/api/projects/${projectId}/members`).send({ userId: dev.id });
  if (res.status !== 201) throw new Error(`project member: ${JSON.stringify(res.body)}`);

  return { admin, pm, dev, clientUser, workspaceId, clientId, projectId };
}

/** Create an APPROVED scope version with one requirement + feature; returns ids. */
export async function makeApprovedScope(fx: Fixture, title = "Feature A") {
  const { pm, projectId } = fx;
  let res = await authed(pm.token).post("/api/requirements").send({ projectId, title });
  const reqId = res.body.data.id as string;
  await authed(pm.token).post(`/api/requirements/${reqId}/approve`);
  res = await authed(pm.token).post("/api/scopes").send({ projectId });
  const scopeId = res.body.data.id as string;
  res = await authed(pm.token).get(`/api/scopes/${scopeId}`);
  const v1 = res.body.data.versions.find((v: { version: number }) => v.version === 1);
  await authed(pm.token).patch(`/api/scope-versions/${v1.id}`).send({
    features: [{ id: "f1", title, description: "", priority: "MEDIUM", requirementIds: [reqId], acceptanceCriteria: [] }],
    deliverables: ["v1"], exclusions: [],
  });
  res = await authed(pm.token).post(`/api/scopes/${scopeId}/request-approval`);
  const approvalId = res.body.data.id as string;
  res = await authed(fx.clientUser.token).post(`/api/approvals/${approvalId}/approve`).send({ signatureName: "Client" });
  if (res.status !== 200) throw new Error(`approve v1: ${JSON.stringify(res.body)}`);
  res = await authed(pm.token).get(`/api/scopes/${scopeId}`);
  const approved = res.body.data.versions.find((v: { status: string }) => v.status === "APPROVED");
  return { scopeId, versionId: approved.id as string, requirementId: reqId, approvalId };
}
