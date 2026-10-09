/* Golden-path smoke: full workflow against running API + worker (mock AI).
   Run: tsx scripts/smoke.ts — exits non-zero on first failure. */
const API = "http://localhost:4000";
const MAILPIT = "http://localhost:8025";
let n = 0;

function ok(cond: unknown, label: string, extra?: unknown) {
  n++;
  if (!cond) {
    console.error(`FAIL #${n} ${label}`, extra ?? "");
    process.exit(1);
  }
  console.log(`ok #${n} ${label}`);
}

async function req(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}

async function poll(label: string, fn: () => Promise<boolean>, timeoutMs = 90000) {
  const start = Date.now();
  for (;;) {
    if (await fn()) { ok(true, label); return; }
    if (Date.now() - start > timeoutMs) ok(false, `${label} (timeout)`);
    await new Promise((r) => setTimeout(r, 1500));
  }
}

async function register(name: string, email: string, inviteToken?: string) {
  const r = await req("POST", "/api/auth/register", undefined, { name, email, password: "password123", ...(inviteToken ? { inviteToken } : {}) });
  ok(r.status === 201 && r.json?.success && r.json.data.accessToken, `register ${email}`, r);
  return { id: r.json.data.id as string, token: r.json.data.accessToken as string };
}

async function main() {
const stamp = Date.now().toString(36);
const pm = await register("PM", `pm-${stamp}@example.com`);
const dev = await register("Dev", `dev-${stamp}@example.com`);

// workspace + members
let r = await req("POST", "/api/workspaces", pm.token, { name: "Smoke Agency" });
ok(r.status === 201, "create workspace", r);
const ws = r.json.data.id as string;
r = await req("POST", `/api/workspaces/${ws}/members`, pm.token, { email: `dev-${stamp}@example.com`, role: "TEAM_MEMBER" });
ok(r.status === 201, "add team member", r);

// client + portal invite
r = await req("POST", "/api/clients", pm.token, { workspaceId: ws, name: "Acme", email: `client-${stamp}@example.com`, company: "Acme Inc" });
ok(r.status === 201, "create client", r);
const client = r.json.data;
r = await req("POST", `/api/clients/${client.id}/portal-invite`, pm.token);
ok(r.status === 201 && r.json.data.link, "portal invite", r);
const inviteToken = (r.json.data.link as string).split("/").pop()!;
const clientUser = await register("Client", `client-${stamp}@example.com`, inviteToken);
const me = await req("GET", "/api/auth/me", clientUser.token);
ok(me.json.data.isClientOnly === true, "client routed to portal", me.json.data);

// project (e-commerce) + project member
r = await req("POST", "/api/projects", pm.token, { workspaceId: ws, clientId: client.id, name: "Shop", projectType: "E_COMMERCE" });
ok(r.status === 201, "create project", r);
const project = r.json.data.id as string;
r = await req("POST", `/api/projects/${project}/members`, pm.token, { userId: dev.id });
ok(r.status === 201, "add project member", r);

// AI-01 checklist + IR + send
r = await req("POST", "/api/ai/checklist", pm.token, { projectType: "E_COMMERCE" });
ok(r.status === 200 && r.json.data.sections?.length >= 3, "AI-01 checklist", r.json.data.source);
r = await req("POST", "/api/information-requests", pm.token, {
  projectId: project, title: "Initial discovery",
  questions: [
    { id: "q1", question: "Describe your store", answerType: "longtext", required: true },
    { id: "q2", question: "Upload your catalog", answerType: "file", required: false },
  ],
});
ok(r.status === 201, "create IR", r);
const ir = r.json.data.id as string;
r = await req("POST", `/api/information-requests/${ir}/send`, pm.token);
ok(r.status === 200 && r.json.data.status === "SENT", "send IR", r);
const mails = await (await fetch(`${MAILPIT}/api/v1/messages`).then((x) => x.json()).catch(() => ({ messages: [] }))) as any;
ok((mails.messages ?? []).length > 0, "ir email reached Mailpit");

// client answers + file
{
  const fd = new FormData();
  fd.append("projectId", project);
  fd.append("informationRequestId", ir);
  fd.append("answers", JSON.stringify({ q1: "We sell handmade soaps online with checkout and wishlist" }));
  fd.append("files", new Blob(["organic soap catalog: lavender, oatmeal"], { type: "text/plain" }), "catalog.txt");
  const res = await fetch(`${API}/api/submissions`, { method: "POST", headers: { Authorization: `Bearer ${clientUser.token}` }, body: fd });
  const j = await res.json();
  ok(res.status === 201 && j.data.files?.length === 1, "client submission + file", j);
}

// AI-02 extraction → requirements; AI-03 readiness auto-queued
await poll("AI-02 extracted requirements", async () => {
  const x = await req("GET", `/api/requirements?projectId=${project}`, pm.token);
  return x.json?.data?.length > 0;
});
r = await req("GET", `/api/requirements?projectId=${project}`, pm.token);
const reqs = r.json.data as Array<{ id: string; code: string; source: string; status: string }>;
ok(reqs.every((x) => x.source === "AI" && x.status === "DRAFT"), "extracted as AI DRAFT with codes", reqs.map((x) => x.code));
await poll("AI-03 readiness report", async () => {
  const x = await req("GET", `/api/projects/${project}/readiness`, pm.token);
  return !!x.json?.data;
});
r = await req("GET", `/api/projects/${project}/readiness`, pm.token);
ok(typeof r.json.data.score === "number", "readiness score present", r.json.data.score);

// clarification loop on first requirement
const firstReq = reqs[0];
r = await req("POST", "/api/requirements/request-clarification", pm.token, {
  projectId: project, requirementIds: [firstReq.id],
  questions: [{ id: "c1", question: "Which payment gateway?", answerType: "text", required: true }],
});
ok(r.status === 201, "clarification requested", r);
const clarIR = r.json.data.id as string;
r = await req("GET", `/api/requirements/${firstReq.id}`, pm.token);
ok(r.json.data.status === "NEEDS_CLARIFICATION", "requirement flagged", r.json.data.status);
{
  const fd = new FormData();
  fd.append("projectId", project);
  fd.append("informationRequestId", clarIR);
  fd.append("answers", JSON.stringify({ c1: "Stripe" }));
  const res = await fetch(`${API}/api/submissions`, { method: "POST", headers: { Authorization: `Bearer ${clientUser.token}` }, body: fd });
  ok(res.status === 201, "clarification answered", res.status);
}
await poll("requirement back to DRAFT with context", async () => {
  const x = await req("GET", `/api/requirements/${firstReq.id}`, pm.token);
  return x.json?.data?.status === "DRAFT" && (x.json.data.sourceContext ?? "").includes("Stripe");
});

// mark ready + approve
r = await req("POST", "/api/requirements/mark", pm.token, { projectId: project, requirementIds: reqs.map((x) => x.id), verdict: "READY" });
ok(r.status === 200, "bulk mark ready", r);
for (const x of reqs) {
  const a = await req("POST", `/api/requirements/${x.id}/approve`, pm.token);
  ok(a.status === 200 && a.json.data.status === "APPROVED", `approve ${x.code}`, a);
}

// scope v1: create, AI-04 criteria, edit features, send
r = await req("POST", "/api/scopes", pm.token, { projectId: project });
ok(r.status === 201, "create scope", r);
const scopeId = r.json.data.id as string;
r = await req("GET", `/api/scopes/${scopeId}`, pm.token);
const v1 = r.json.data.versions.find((v: any) => v.version === 1);
ok(v1?.status === "DRAFT", "v1 draft exists", v1);
r = await req("POST", "/api/ai/acceptance-criteria", pm.token, { scopeVersionId: v1.id });
ok(r.status === 202 && r.json.data.aiRunId, "AI-04 queued", r);
await poll("AI-04 criteria saved as AI_DRAFT", async () => {
  const x = await req("GET", `/api/requirements/${firstReq.id}`, pm.token);
  return x.json?.data?.acceptanceCriteriaStatus === "AI_DRAFT";
});
const feats = reqs.map((x, i) => ({ id: `f${i}`, title: `Feature for ${x.code}`, description: "", priority: "MEDIUM", requirementIds: [x.id], acceptanceCriteria: [{ given: "store is open", when: "customer checks out", then: "order is placed" }] }));
r = await req("PATCH", `/api/scope-versions/${v1.id}`, pm.token, { features: feats, deliverables: ["Shop v1"], exclusions: ["Native apps"] });
ok(r.status === 200, "PM edits v1 draft", r);
r = await req("POST", `/api/scopes/${scopeId}/request-approval`, pm.token);
ok(r.status === 201, "v1 sent for approval", r);

// client approves v1 → APPROVED + certificate
r = await req("GET", "/api/approvals", clientUser.token);
const appr1 = (r.json.data as any[]).find((a) => a.status === "PENDING");
ok(!!appr1, "client sees pending approval", r.json.data);
r = await req("POST", `/api/approvals/${appr1.id}/approve`, clientUser.token, { signatureName: "Acme Owner" });
ok(r.status === 200, "client approves v1", r);
r = await req("GET", `/api/approvals/${appr1.id}`, clientUser.token);
ok(r.json.data.status === "APPROVED" && r.json.data.signatureName === "Acme Owner" && r.json.data.contentHash && r.json.data.decidedAt, "approval certificate", r.json.data);

// firewall: task without approved version rejected (use a DRAFT version)
r = await req("POST", `/api/scopes/${scopeId}/versions`, pm.token, {});
ok(r.status === 201, "v2 draft created for firewall test", r);
const v2draft = r.json.data.id as string;
r = await req("POST", "/api/tasks", pm.token, { projectId: project, scopeVersionId: v2draft, title: "Sneaky task" });
ok(r.status === 409, "firewall: no task on DRAFT version", r);

// generate tasks from APPROVED v1 + bulk + lifecycle
r = await req("GET", `/api/scope-versions/${v1.id}/generate-tasks`, pm.token);
ok(r.status === 200 && r.json.data.preview.length > 0, "task preview", r.json.data.preview.length);
// delete the stray v2 draft? No delete route (immutable) — leave it; bulk against v1.
const previewTasks = r.json.data.preview.map((t: any) => ({ ...t, assigneeId: dev.id }));
r = await req("POST", `/api/projects/${project}/tasks/bulk`, pm.token, {
  scopeVersionId: v1.id,
  tasks: previewTasks,
});
ok(r.status === 201 && r.json.data.length === previewTasks.length, "bulk tasks with codes", r.json.data.map((t: any) => t.code));
const task1 = r.json.data[0].id as string;
r = await req("PATCH", `/api/tasks/${task1}`, dev.token, { status: "IN_PROGRESS" });
ok(r.status === 200, "dev moves own task", r);
r = await req("PATCH", `/api/tasks/${task1}`, dev.token, { status: "COMPLETED" });
ok(r.status === 403, "team cannot COMPLETE", r);
r = await req("PATCH", `/api/tasks/${task1}`, dev.token, { status: "REVIEW" });
ok(r.status === 200, "dev moves to REVIEW", r);
r = await req("PATCH", `/api/tasks/${task1}`, pm.token, { status: "COMPLETED" });
ok(r.status === 200 && r.json.data.completedAt, "PM completes", r);

// change request (Wishlist) → AI-05 → PM review → v2 flow
r = await req("POST", "/api/change-requests", clientUser.token, { projectId: project, title: "Wishlist", description: "Customers want a wishlist page with sharing" });
ok(r.status === 201 && r.json.data.code?.startsWith("CR-"), "CR submitted", r.json.data.code);
const cr = r.json.data.id as string;
await poll("AI-05 analyzed", async () => {
  const x = await req("GET", `/api/change-requests/${cr}`, pm.token);
  return !!x.json?.data?.aiClassification;
});
r = await req("PATCH", `/api/change-requests/${cr}`, pm.token, { status: "UNDER_REVIEW", estimatedHours: 20 });
ok(r.status === 200, "CR under review", r);
// firewall: task from non-approved CR rejected
r = await req("POST", "/api/tasks", pm.token, { projectId: project, scopeVersionId: v1.id, changeRequestId: cr, title: "CR task too early" });
ok(r.status === 409, "firewall: no task from UNDER_REVIEW CR", r);
r = await req("POST", `/api/change-requests/${cr}/approve`, pm.token, {
  finalClassification: "OUT_OF_SCOPE", createScopeVersion: true,
  newFeatures: [{ title: "Wishlist page", description: "Save + share wishlist", priority: "MEDIUM", requirementIds: [], acceptanceCriteria: [] }],
});
ok(r.status === 200 && r.json.data.proposedScopeVersionId, "CR approved with v2 proposal", r);
const v2id = r.json.data.proposedScopeVersionId as string;
r = await req("POST", "/api/approvals", pm.token, { scopeVersionId: v2id });
ok(r.status === 201, "v2 sent for approval", r);
const appr2id = r.json.data.id as string;
r = await req("POST", `/api/approvals/${appr2id}/approve`, clientUser.token, { signatureName: "Acme Owner" });
ok(r.status === 200, "client approves v2", r);
r = await req("GET", `/api/scope-versions/${v1.id}`, pm.token);
ok(r.json.data.status === "SUPERSEDED", "v1 superseded", r.json.data.status);
r = await req("GET", `/api/change-requests/${cr}`, pm.token);
ok(r.json.data.status === "APPROVED" && r.json.data.resultingScopeVersionId === v2id, "CR approved via v2", r.json.data.status);
// onlyNew tasks → complete → IMPLEMENTED
r = await req("GET", `/api/scope-versions/${v2id}/generate-tasks?onlyNew=true`, pm.token);
ok(r.status === 200 && r.json.data.preview.length > 0, "onlyNew preview", r.json.data.preview.length);
r = await req("POST", `/api/projects/${project}/tasks/bulk`, pm.token, { scopeVersionId: v2id, tasks: r.json.data.preview.map((t: any) => ({ ...t, changeRequestId: cr, assigneeId: dev.id })) });
ok(r.status === 201, "CR tasks created", r.json.data.length);
for (const t of r.json.data as any[]) {
  await req("PATCH", `/api/tasks/${t.id}`, pm.token, { status: "COMPLETED" });
}
await poll("CR IMPLEMENTED", async () => {
  const x = await req("GET", `/api/change-requests/${cr}`, pm.token);
  return x.json?.data?.status === "IMPLEMENTED";
});

// dashboard, activity, traceability
r = await req("GET", `/api/dashboard/analytics?workspaceId=${ws}`, pm.token);
ok(r.status === 200 && r.json.data.totals.totalProjects === 1 && r.json.data.totals.completedTasks >= 2, "dashboard counts", r.json.data.totals);
r = await req("GET", `/api/activity?projectId=${project}&limit=100`, pm.token);
const actions = (r.json.data as any[]).map((a) => a.action);
for (const a of ["project.created", "ir.sent", "submission.created", "requirement.approved", "scope.sent_for_approval", "scope.version.approved", "cr.submitted", "cr.implemented"]) {
  ok(actions.includes(a), `activity has ${a}`);
}
r = await req("GET", `/api/projects/${project}/traceability`, pm.token);
ok(r.json.data.project.stage === "completed" && r.json.data.requirements.length > 0, "traceability completed stage", r.json.data.project.stage);

// negative: cross-workspace + RBAC + portal isolation
const eve = await register("Eve", `eve-${stamp}@example.com`);
r = await req("GET", `/api/projects/${project}`, eve.token);
ok(r.status === 404, "cross-workspace → 404", r.status);
r = await req("DELETE", `/api/projects/${project}`, dev.token);
ok(r.status === 403, "team cannot delete project", r.status);
r = await req("POST", "/api/messages", pm.token, { projectId: project, content: "internal note", visibility: "INTERNAL" });
ok(r.status === 201, "internal message", r);
r = await req("GET", `/api/messages?projectId=${project}`, clientUser.token);
ok(!(r.json.data as any[]).some((m) => m.visibility === "INTERNAL"), "client never sees INTERNAL", (r.json.data as any[]).length);
r = await req("GET", "/api/tasks", clientUser.token);
ok(r.status === 403, "client cannot list tasks", r.status);

console.log(`\nSMOKE COMPLETE: ${n} assertions passed`);
}

void main().catch((e) => { console.error("SMOKE ERROR", e); process.exit(1); });
