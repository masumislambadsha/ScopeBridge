# AGENTS.md — ScopeBridge conventions

Read `docs/IMPLEMENTATION_SPEC.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md` before continuing after any context reset.

## Folder layout
- `backend/src/`: `app.ts`, `index.ts`, `config/env.ts` (Zod, fail fast), `core/` (http: asyncHandler, AppError, responses; errors; pagination; logger), `middleware/` (auth, access, validate, rateLimit, upload), `modules/<domain>/` (`<domain>.routes.ts`, `.controller.ts`, `.service.ts`, `.schemas.ts`) for auth, users, workspaces, invitations, clients, projects, portal, information-requests, submissions, files, requirements, scopes, approvals, tasks, change-requests, messages, notifications, activity, dashboard, ai, traceability; `services/` (storage, mailer, ai provider, audit, notify, realtime); `queues/` + `workers/processors/` (one file per queue); `openapi/` (registry + document builder).
- `frontend/`: Next.js App Router; `app/` routes, `components/ui/` (shadcn), `lib/` (api client, auth, socket, query client).
- `docs/`: spec, decisions, progress, issues, board, PRs (`docs/pull-requests/NN-<branch>.md`), `01-…15-*.md`, `openapi.json`, `requirements/`.

## HTTP response format (§3.2)
- Success: `{ "success": true, "data": ..., "meta"?: { "page", "limit", "total", "totalPages" } }`. 202 for queued AI jobs: `{ "success": true, "data": { "aiRunId": "..." } }`. No 204.
- Error: `{ "success": false, "error": { "code": "...", "message": "...", "details"?: [{ "path": "...", "message": "..." }] } }`.

## Error codes
`VALIDATION_ERROR` 400 · `UNAUTHENTICATED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 (also for cross-workspace entities — never leak existence) · `CONFLICT` 409 · `FILE_TOO_LARGE` 413 · `RATE_LIMITED` 429 · `INTERNAL` 500 (no internals). Prisma: P2002→409, P2025→404, P2003→400.

## Naming
- Conventional Commits: `feat(scope): …`, `fix(auth): …`, `test(tasks): …`, `docs(…): …`, `chore(ci): …`.
- Branches off `develop`: `feature/<slice>`, `chore/<x>`, `docs/<x>`. Merge with `--no-ff`; PR text → `docs/pull-requests/NN-<branch>.md`. Never force-push `main`/`develop`.
- Activity actions: dot.case (`scope.version.approved`). Permissions: `<resource>.<verb>` (`scope.send_for_approval`). Codes: `REQ-001`, `TASK-001`, `CR-001` via per-project sequences.
- Env: `AI_PROVIDER=gemini|mock`, `STORAGE_DRIVER=cloudinary|local` (local refused in prod).

## Test commands
- `npm run typecheck` (both workspaces, `tsc --noEmit`), `npm run lint`, `npm test` (backend vitest; frontend unit if any), `npm run test:e2e` (playwright), `npm run build`, `npm run openapi:export`.
- Backend tests need Postgres + Redis + Mailpit running; `AI_PROVIDER=mock`, `STORAGE_DRIVER=local`.

## Security rules (non-negotiable)
- Every route: auth (except public auth/invite-preview/health) + `getProjectAccess`/`getWorkspaceAccess` + `can(access, permission)` + Zod `validate()` on body/query/params.
- Client users get client DTOs only (serializers strip internals: drafts, INTERNAL messages, assignees, aiFlags, other clients, members).
- AI never writes decision statuses. DRAFT versions editable only; approvals immutable once decided; activity log append-only.
- Never commit `.env` or secrets. `.env.example` keeps safe placeholders for every var.
