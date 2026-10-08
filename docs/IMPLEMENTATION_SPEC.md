# ScopeBridge: finish the entire project (single master task)

> Source: master task brief (single source of truth). The requirements PDF in the repo root
> (`ScopeBridgeTest1.pdf`, original Bengali spec) has garbled text extraction, so this file
> governs. Saved to `docs/IMPLEMENTATION_SPEC.md` per §0.2.

You are the lead engineer on **ScopeBridge**, a monorepo at the root of this working directory (`frontend/` Next.js, `backend/` Express). Your job is to take the repository from its current prototype state to a **complete, tested, documented, deployable MVP** that meets every requirement in this document. Work autonomously from start to finish. Do not stop after a phase to ask whether to continue.

This document is the single source of truth. The requirements PDF in the repo root (`ScopeBridgeTest1.pdf`) is the original Bengali spec, and its text extraction is garbled, so rely on this file instead.

---

## 0. How to work (read before touching code)

### 0.1 Non-negotiable rules
1. **Keep the mandated stack.** Frontend: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui. Backend: Node.js, Express 4, TypeScript. Database: PostgreSQL with Prisma. Auth: JWT and Argon2. Validation: Zod. AI: Gemini API. Realtime: Socket.IO. Jobs: Redis and BullMQ. Files: Cloudinary. Docs: Swagger/OpenAPI. Tests: Playwright, plus Vitest and Supertest for the backend. Deploy: Vercel (frontend), Render (API and worker), Neon (Postgres).
2. **Keep every API path listed in §7.1 exactly as written.** You may add routes, but you may not rename or remove the required ones.
3. **Never edit `backend/prisma/migrations/0001_init`.** Make every schema change with `npx prisma migrate dev --name <name>`. The dev database may be reset. Assume no production data exists yet.
4. **No dummy data anywhere in the shipped app.** No hard-coded sample tasks, no hard-coded project types, no fake numbers. Show proper empty states instead.
5. **AI never makes a final decision.** AI may analyze, extract, suggest, compare and generate drafts. Only a human changes a decision status: requirement approval, scope approval, or change request approval/rejection.
6. **No stubs, no TODOs, no "not implemented" endpoints in the final result.** If something truly needs credentials you don't have (for example a production deploy), finish everything else and document the exact remaining human steps.
7. **Never commit secrets.** `.env` stays git-ignored. `.env.example` lists every variable with safe placeholders.
8. **Raise quality as you go.** After every phase, run `npm run typecheck`, `npm run lint` and `npm test`, and keep them green before moving on.
9. **Record decisions.** Make reasonable decisions yourself and log each one in `docs/DECISIONS.md` (one short entry: context, decision, consequence). Ask me only if you are blocked by missing credentials or access.

### 0.2 Working memory (so you survive long sessions and context resets)
- First action: copy this entire file to `docs/IMPLEMENTATION_SPEC.md` and commit it.
- Create `AGENTS.md` at the repo root with the conventions you adopt: folder layout, response format, error codes, naming, test commands, branch rules. Keep it updated.
- Create `docs/PROGRESS.md` with the phase list from §14. Update it at the end of every phase: what was done, what was verified, and what is next.
- If you lose context, re-read `docs/IMPLEMENTATION_SPEC.md`, `AGENTS.md` and `docs/PROGRESS.md` before continuing.
- Use your todo/task tool to track the phases and sub-tasks.

### 0.3 Local environment
- `docker compose up -d` must start **Postgres 16, Redis 7 and Mailpit** (SMTP on 1025, UI and API on 8025). Add Mailpit to `docker-compose.yml`.
- `cp .env.example .env` must be enough to run everything locally.
- The app must run **without a Gemini key**. In that case AI features degrade to manual mode, and tests use `AI_PROVIDER=mock`.
- The app must run **without Cloudinary credentials** in dev and test via `STORAGE_DRIVER=local`. The local driver is refused when `NODE_ENV=production`.

---

## 1. What ScopeBridge is

ScopeBridge is a **client-to-development workflow and scope management platform** for small software agencies, freelance developers and designers, and project managers. Its purpose is to **reduce scope creep and protect agency revenue**. It does this by turning scattered client input (WhatsApp, email, calls, PDFs, screenshots, meetings) into one traceable chain:

```
Client Input → Requirement → AI Analysis → Approved Scope (versioned) → Development Task
→ Change Request → AI Scope Analysis → Human Approval → New Scope Version → New Task
```

Every item must stay traceable: what the client asked for, which requirements were created, what was clarified, what was approved, which tasks came from it, what changed later, and whether each change was in or out of scope. The **Change Request Firewall** (no client change becomes development work without analysis plus human approval plus a new approved scope version) is the product's core differentiator. Treat traceability and the firewall as the most important features.

**Roles:** Workspace Admin, Project Manager (PM), Team Member/Developer (agency side), and Client (portal side). Clients must never see agency-internal data.

**Complete workflow the finished app must support end-to-end:**
1. Register, log in, create a workspace, invite team members, create a client, create a project.
2. Client portal access: the PM sends an information request, the client answers and uploads files.
3. AI extracts requirements, then AI analyzes readiness.
4. If information is missing: a clarification request goes to the client, the client answers, and readiness is re-checked.
5. If nothing is missing: the PM reviews and approves requirements.
6. The PM builds the scope, AI drafts acceptance criteria, and the PM edits them. This becomes Scope v1.
7. The client approves Scope v1 (or rejects it or requests changes, which loops back to clarification and a new draft).
8. Tasks are generated from the approved scope and development starts.
9. The client submits a change request. AI compares it with the approved scope and analyzes impact. The PM reviews it.
   - If the PM rejects it, it is closed.
   - If the PM approves it, a Scope v2 draft is created and goes to the client for approval.
10. Client approves v2: v2 is approved, v1 is superseded, new tasks are created, development continues, and the project is completed.

---

## 2. Current state of the repo (audit results)

### 2.1 Keep (already reasonable)
- Monorepo with npm workspaces, Express app wiring (helmet, cors, cookie-parser, morgan), and Prisma schema with 16 core entities plus `PasswordResetToken`. The migration matches the schema.
- Argon2 hashing, a 15-minute access JWT, and a rotating refresh token in an httpOnly cookie with its jti stored in Redis.
- BullMQ queues and a separate worker process, Zod parsing of AI output, Cloudinary upload helper, multer with size limit, pagination helper.
- Most route paths from §7.1 already exist.

### 2.2 Verified defects (each one was reproduced against a running instance, and all must be fixed)
1. **Any invalid request body crashes the API process.** Controllers are `async` on Express 4 and call `schema.parse()`, and there is no async error wrapper. The thrown ZodError becomes an unhandled rejection and Node exits. Example: `POST /api/workspaces {}` kills the server. `middleware/validate.ts` exists but is never used.
2. **`approvals.controller.ts` has no authorization.** Any logged-in user can approve or reject any approval. There is no check that the approval is still `PENDING`. `listApprovals` and `createApproval` aren't scoped to the user's workspace.
3. **Cross-workspace data leaks:**
   - `GET /api/tasks` and `GET /api/change-requests` without `projectId` return rows from every workspace.
   - `GET /api/users` returns the global user directory.
   - `GET /api/users/:id` returns any user.
4. **`workspaces.controller.ts` member routes:**
   - `patchMember` and `removeMember` check the role on `:id` but act on `:memberId` without verifying it belongs to that workspace. An admin of workspace B removed the owner of workspace A and locked them out.
   - `listMembers` has no membership check.
   - The owner can be demoted or removed.
5. **`lib/socket.ts`:** `project:join` performs no access check, so anyone can subscribe to any project's events and messages.
6. **The worker calls `emitToProject`/`emitToUser`, but `io` is `null` in the worker process.** No realtime event from any AI job ever reaches a browser.
7. **The client portal is non-functional.**
   - There is no client access path, and `Client.portalUserId` is never set.
   - Portal pages call agency-only endpoints, so the client gets an empty list and 403s.
   - `portal/requests/[id]` sends `clientId: ''` because `getInfoRequest` doesn't include `project`, which triggers defect 1.
8. **Submissions and change requests take `clientId` from the request body** without verifying it belongs to the project.
9. **Change requests:**
   - `acceptChangeRequest` does not create a new scope version, although a comment says it does.
   - The UI never sets `scopeVersionId`, so AI-05 compares against `{}`.
   - The CR route accepts a file upload and silently ignores `req.file`.
10. **Scope:**
    - `PATCH /api/scopes/:id {status:"APPROVED"}` bypasses client approval.
    - The v1 snapshot is taken before the AI fills the scope, so it is empty.
    - The AI scope worker overwrites PM edits.
11. **AI-02** passes only the file URL string to Gemini, so documents are never read. `POST /api/ai/extract` is a stub.
12. **AI-03** analyzes only `ACCEPTED` requirements, which is the wrong order, and it matches requirements by title. The readiness and scope workers have no failure or manual-mode handling.
13. **Reminders and email:** the reminders queue is never scheduled and no email is ever sent. The password-reset token is only logged or returned in the response.
14. **Audit trail:** only 3 actions are logged (workspace, client and project created).
15. **Firewall and dummy data:**
    - Tasks can be created with no approved scope.
    - The UI "Bulk create" button makes hard-coded "Bulk task 1/2".
    - The AI-01 UI hard-codes the project type `"web app"`.
16. **`config/env.ts` falls back to hard-coded JWT secrets.**
17. **Gemini:** `GEMINI_MODEL=gemini-1.5-flash` is retired, and the API key is sent in the URL query string.
18. **Vulnerable dependencies:** `jsonwebtoken@8` has known CVEs (upgrade to 9) and `multer@1` is deprecated with known vulnerabilities (upgrade to 2).
19. **Deployment:**
    - `render.yaml` sets `NODE_ENV=production` at build time, so `npm install` skips devDependencies and `tsc`/`prisma` are missing.
    - The worker runs through `tsx`, which is a devDependency.
20. **Frontend:**
    - shadcn/ui is not actually used.
    - Pages dump raw JSON, the layout isn't responsive, and there are no route guards and no logout.
    - There are no screens for creating information requests, editing scope, sending for approval, viewing submissions or files, or viewing activity.
    - The socket connects only if a token existed at first page load.
21. **Swagger** documents only `POST /api/auth/register`.
22. **Playwright** has only 4 tests that check page headings.
23. **Git and docs:** only 2 commits on `main`, with no develop or feature branches, PRs or issues. There is no ERD, schema doc, SDA workflow, git workflow, testing strategy or deployment documentation.
24. **Upload validation:** the magic-byte check returns `true` for doc and txt, images are limited to png/jpeg, and file name and uploader are not stored.
25. **RBAC:** it is enforced only on workspace routes. A `TEAM_MEMBER` can delete projects and clients, accept change requests, and so on.
26. **Approvals:** the approval record doesn't store who made the decision, and there is no integrity protection.

---

## 3. Target architecture

### 3.1 Backend layout (refactor into domain modules)
```
backend/src/
  app.ts, index.ts (API), workers/worker.ts (worker entry)
  config/env.ts                 # Zod-validated env, fail fast
  core/                         # http (asyncHandler, AppError, response helpers), errors, pagination, logger
  middleware/                   # auth, access (project/workspace access resolution), validate, rateLimit, upload
  modules/<domain>/             # auth, users, workspaces, invitations, clients, projects, portal,
                                # information-requests, submissions, files, requirements, scopes,
                                # approvals, tasks, change-requests, messages, notifications,
                                # activity, dashboard, ai, traceability
     <domain>.routes.ts  <domain>.controller.ts  <domain>.service.ts  <domain>.schemas.ts
  services/                     # storage (cloudinary|local), mailer, ai provider (gemini|mock), audit, notify, realtime
  queues/ + workers/processors/ # one processor file per queue
  openapi/                      # zod-to-openapi registry + document builder
```
- Controllers stay thin: parse input, call a service, send a response. Business rules and state machines live in services, which are unit-testable.
- Stay on **Express 4**. Wrap every handler with an `asyncHandler`, or use a router helper that wraps automatically. Add `process.on('unhandledRejection'|'uncaughtException')` logging. Never swallow errors silently.

### 3.2 HTTP conventions
- **Success:** `{ "success": true, "data": ..., "meta"?: { "page", "limit", "total", "totalPages" } }`
- **Error:** `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details"?: [{ "path": "email", "message": "..." }] } }`
- **Status codes:**
  - 200, 201 (created), 202 (queued AI job, which returns `{ aiRunId }`), 204 is not used.
  - 400 `VALIDATION_ERROR` (any ZodError, and multer type errors).
  - 401 `UNAUTHENTICATED`, 403 `FORBIDDEN` (same workspace, insufficient role).
  - **404 `NOT_FOUND` for entities in another workspace**, so their existence never leaks.
  - 409 `CONFLICT` (Prisma P2002, invalid state transitions), 413 `FILE_TOO_LARGE`, 429 `RATE_LIMITED`, 500 `INTERNAL` with no internal details.
- Map Prisma errors as follows: P2002 → 409, P2025 → 404, P2003 → 400.
- Validate `body`, `query` and `params` with the `validate()` middleware on every route. Schemas live in `<domain>.schemas.ts` and are reused for OpenAPI.
- Every list endpoint is paginated (`?page=1&limit=20`, max 100) and filterable where it makes sense. Avoid N+1 queries: use `include`/`select` and `Promise.all` with `count`/`groupBy`.

### 3.3 Auth and session
- Access JWT (15 minutes) is returned in the body and kept **in memory** on the frontend, not in localStorage.
- The refresh JWT (7 days) is set as an httpOnly, Secure, SameSite cookie, rotated on every refresh, with its jti in Redis. Logout revokes it.
- **Make the cookie first-party:** the frontend calls `/api/*` on its own origin, and Next.js `rewrites()` proxy it to `BACKEND_URL`. Two exceptions go directly to `NEXT_PUBLIC_API_URL` with the bearer token, because no cookie is needed and proxied request bodies may be size-limited:
  - multipart uploads;
  - the Socket.IO connection.
  - Configure CORS for those.
- Add `GET /api/auth/me`. It returns the user, workspace memberships with roles, and client-portal access (the list of clients and projects this user is the portal user for). The frontend uses it to route agency users to `/dashboard` and clients to `/portal`. Users with both kinds of access get a switcher.
- On app load the frontend calls `/api/auth/refresh` to restore the session.

### 3.4 Access control (the heart of security)
Implement one resolver and use it everywhere:
```ts
getProjectAccess(userId, projectId) →
  | { kind: 'MEMBER', workspaceId, role: 'ADMIN'|'PROJECT_MANAGER'|'TEAM_MEMBER', isProjectMember: boolean }
  | { kind: 'CLIENT', workspaceId, clientId }
  | null   // → 404
```
Do the same with `getWorkspaceAccess(userId, workspaceId)`. Every project-scoped endpoint loads the entity, resolves access from the entity's `projectId` (never from client-supplied IDs), and checks a central permission table (`can(access, 'scope.send_for_approval')`). Client users get **client DTOs**: explicit serializers that only include client-safe fields.

| Permission | Admin | PM | Team Member | Client (portal user of that project's client) |
|---|---|---|---|---|
| Workspace update, delete, settings | ✓ | – | – | – |
| Invite, remove, change role of members | ✓ | – | – | – |
| Clients CRUD, portal invite | ✓ | ✓ | read | – |
| Projects create, update, delete, manage project members | ✓ | ✓ | read (only projects where they are a ProjectMember) | read own projects (DTO) |
| Information requests CRUD and send | ✓ | ✓ | read | read `SENT`/`ANSWERED` ones on own projects |
| Submissions and file upload | ✓ | ✓ | read | create on own projects |
| Requirements CRUD, approve, request clarification | ✓ | ✓ | read | read (excluding DRAFT/REJECTED; no `aiFlags`) |
| Scope versions edit, send for approval | ✓ | ✓ | read | read non-DRAFT versions |
| Approve, reject or request changes on a scope approval | – | – | – | ✓ (only approvals addressed to their client) |
| Tasks create, assign, delete, generate | ✓ | ✓ | – | – (sees progress % only) |
| Task status update | ✓ | ✓ | own assigned tasks, up to `REVIEW` | – |
| Change requests create | ✓ | ✓ (on the client's behalf) | – | ✓ own projects |
| CR review, approve, reject | ✓ | ✓ | – | – (the client decides through the scope approval of the resulting version) |
| Messages | all | all | projects they belong to | `CLIENT`-visibility messages only |
| Trigger AI | ✓ | ✓ | – | – |
| Dashboard analytics, activity log | ✓ | ✓ | own tasks view; project activity read | portal summary only |

Additional rules:
- The workspace owner can't be removed or demoted.
- At least one admin must always remain.
- `memberId` must belong to the workspace in the URL.
- `GET /api/users` requires `workspaceId` and returns only members of a workspace the requester belongs to. `GET /api/users/:id` returns only yourself or someone who shares a workspace with you.

### 3.5 Realtime
- Socket.IO with JWT auth on handshake. The client reconnects with a fresh token after login or refresh.
- Rooms: `user:<id>`; `project:<id>:team` (agency members with access); `project:<id>:client` (portal user, client-safe events only).
- `project:join` must call `getProjectAccess` and join the correct room. Unauthorized joins are refused.
- Use **`@socket.io/redis-adapter`** in the API and **`@socket.io/redis-emitter`** in the worker so worker events reach browsers.
- Events: `notification:new`, `message:new`, `ai:run:updated`, `submission:new`, `requirement:updated`, `scope:version:updated`, `approval:updated`, `task:updated`, `change-request:updated`. Frontend invalidates matching React Query caches on each event.

### 3.6 Background jobs (BullMQ)
- Queues: `ai` (all five AI features, keyed by `AiRun.id`), `files` (text extraction), `email`, `reminders` (repeatable).
- Defaults: 3 attempts with exponential backoff, `removeOnComplete`/`removeOnFail` limits, idempotent processors.
- On final failure, mark the `AiRun` as `FAILED`, emit an event, notify the PM, and the UI switches to manual mode.
- Register the reminders schedule at worker startup with `queue.upsertJobScheduler(...)` (BullMQ ≥ 5.16) running hourly.
- Graceful shutdown on SIGTERM: close workers, queues, HTTP server, Prisma and Redis.

### 3.7 Service abstractions
- **Storage:** `StorageService { upload(buffer, meta) → { key, url }, getDownloadUrl(key) }`. Cloudinary: `resource_type: 'auto'` as authenticated/private, short-lived signed URLs via `GET /api/files/:id/download`. Local (dev/test only): `backend/.uploads`.
- **Mailer:** nodemailer over SMTP (Mailpit locally), HTML templates for invitation, client portal invite, password reset, information request sent, reminder, scope approval requested, scope decided, CR decided. Email via the `email` queue. Test: Mailpit or JSON transport.
- **AI provider:** `AiProvider` with `gemini` + deterministic `mock` (fixtures for every code path + failure mode). Production refuses `AI_PROVIDER=mock`.
- **Env (`config/env.ts`, Zod):** infrastructure (`NODE_ENV`, `PORT`, `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `FRONTEND_URL`, `BACKEND_PUBLIC_URL`); auth secrets (≥32 chars, required, no fallbacks); AI (`AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`); storage (`STORAGE_DRIVER`, `CLOUDINARY_*`); email (`SMTP_*`, `MAIL_ENABLED`); rate limits (`RATE_LIMIT_*`); frontend (`BACKEND_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`).

---

## 4. Data model (Prisma): target schema
(See master brief §4 for full enums and models: Invitation, ProjectMember, File, ReadinessReport, ScopeVersionRequirement, AiRun, new statuses, codes/sequences, settings, signatures, contentHash, actorType, client DTO rules. Constraints and indexes on every FK and common filter. Field names may vary slightly; every concept must exist.)

## 5. Functional requirements
FR-01…FR-30 plus Traceability, per master brief §5. Every FR: backend + UI + permission checks + audit entry + notifications + tests.

## 6. AI features (Gemini), the minimum 5
Per master brief §6: `@google/genai` SDK or REST with `x-goog-api-key` header (never in URL); verified stable Flash model (no `gemini-1.5-*`); structured output + Zod validation; AiRun per call; 202 `{ aiRunId }`; `GET /api/ai/runs/:id`; `ai:run:updated`; prompt-injection hardening; chunking; per-workspace AI rate limits; BullMQ retries + FAILED + manual-mode banner + Retry button. AI-01…AI-05 per spec. **AI decision rule + test.**

## 7. API
§7.1 paths kept exactly; §7.2 routes added (`me`, invitations, project members, traceability, portal, send, files, requirement approve/clarification, scope compare, request-changes, generate-tasks, bulk, read-all, activity, analytics, ai runs, health/ready, api-docs.json). OpenAPI generated from Zod schemas (`@asteasolutions/zod-to-openapi`), `npm run openapi:export` → `docs/openapi.json`, CI completeness check.

## 8. Frontend
Next.js + TS + Tailwind + shadcn/ui (`components.json`; Tailwind v3-compatible CLI per DECISIONS.md D-02) + react-query + hook-form/zod + sonner + lucide + recharts + dnd-kit + date-fns. Typed API client (in-memory token, refresh-once-on-401, field errors). Agency + portal shells, guards, logout. All pages per §8. UX rules: no raw JSON, skeletons/empty/error states, toasts, confirm dialogs, badge colors, AI-draft labels, manual-mode banner. Responsive 375/768/1280+. A11y basics.

## 9. Non-functional requirements
Per master brief §9 (pagination, select/include, indexes, BullMQ; argon2id/JWT/RBAC/Zod-env/magic-bytes/Redis rate limits/helmet/CORS/rotation; mapped errors, manual mode, no orphan uploads, graceful shutdown, /health+/ready; stateless API; responsive).

## 10. Testing
Vitest+Supertest on real Postgres+Redis (`AI_PROVIDER=mock`, `STORAGE_DRIVER=local`, Mailpit/JSON mail): auth, RBAC matrix, isolation, portal isolation, fuzz-no-crash, firewall, immutability/integrity, CR→v2→SUPERSEDED→IMPLEMENTED, AI-failure-manual-mode, AI decision rule, reminder idempotency, notification matrix. Playwright golden path (12 steps, PM+client contexts, Mailpit API) + negative + 375px smoke. CI: install, typecheck, lint, backend tests, frontend build, E2E + artifact, OpenAPI check, npm audit (high).

## 11. Git workflow and project management
`main` + `develop`; feature branches; Conventional Commits; no `gh` on this machine → local `--no-ff` merges + `docs/pull-requests/NN-<branch>.md`; `docs/ISSUES.md` + `docs/PROJECT_BOARD.md`; `.github/ISSUE_TEMPLATE/` + `CONTRIBUTING.md`; human code review noted in final report.

## 12. Deployment
Per master brief §12 (Render API + worker with compiled `node dist/...`, Neon pooled/direct URLs, `directUrl`, rediss support, Vercel rewrites, Secure cookies, CORS allowlist). Vercel/Render CLIs not authenticated → `docs/DEPLOYMENT.md` click-by-click + env table; never invent URLs.

## 13. Documentation deliverables
README + docs/01…15 + DEPLOYMENT.md + DECISIONS.md + PROGRESS.md + openapi.json; PDF moved to `docs/requirements/`; Mermaid ERD/architecture/SDA matching code.

## 14. Execution plan
Phases 0–12 per master brief §14, each: branch → vertical slice → typecheck+lint+test (+e2e when exists) → smoke → commit → merge PR → PROGRESS update. Green before next phase.

## 15. Definition of Done
All §15 boxes (core product, AI, engineering, architecture docs, deployment, additionally) must be true. Final report: DoD table with evidence; local commands + counts; URLs or human steps; decisions + limitations; branches/PRs/issues.
