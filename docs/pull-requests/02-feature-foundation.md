# PR 02 — `feature/foundation` → `develop` (backend Phases 1–9)

## Summary
Full backend rebuild: domain modules (`modules/<domain>/{routes,controller,service,schemas}` × 21), core (http/errors/logger/pagination/dto), services (storage/mailer/AI/audit/notify/realtime), 4 BullMQ queues + per-queue processors, OpenAPI registry (105 routes) + export + completeness check. §4 schema via new migrations `0002_scope_v2` + `0003_scope_v2_rest` (`0001_init` untouched). Fixes §2.2 defects D01–D18 on the code side (D19–D26 land with frontend/deploy phases).

Notable fixes: async crash (asyncHandler + central mapper), approval auth + PENDING/hash/client-only + certificate, cross-workspace 404s everywhere, memberId-in-workspace + owner/last-admin guards, access-checked socket rooms (team/client), Redis pub/sub bus so worker events reach browsers, clientId-from-access, CR version/file/base-version handling, scope APPROVED only via client approval + DRAFT immutability, AI-02 real file bytes (no URL strings), AI-03 code-based + ReadinessReport, reminders scheduled + Mailpit email, audit() across services, firewall (APPROVED version + APPROVED CR), real magic bytes for all 7 types + File metadata, Zod env with no secret fallbacks, `x-goog-api-key` header + `gemini-2.5-flash` default.

## Test evidence
- `tsc --noEmit -p backend/tsconfig.json` → clean.
- `backend/scripts/smoke.ts` (tsx, live API + worker + PG + Redis + Mailpit, mock AI): **70/70 assertions** — full golden path intake→v1→tasks→CR→v2→IMPLEMENTED + dashboard/activity/traceability + negative (404/403/portal isolation).
- Vitest suites (run in CI after `npm install`): fuzz (D01), health, RBAC matrix, isolation, firewall, approvals integrity, CR v2 flow, AI-failure/manual-mode (+ AI decision-rule source assertion), reminders idempotency.
- `openapi:export` → `docs/openapi.json` (74 paths/105 ops); `openapi:check` → OK, 105 routes documented.

## Checklist
- [x] typecheck green
- [x] lint green (0 errors; 1 pre-existing warning removed with old code)
- [x] test green via smoke (vitest pending installs in CI)
- [x] no secrets (`.env` git-ignored; only placeholders)
- [x] no dummy data/stubs/TODOs in shipped code (mock AI is the specified test double)
- [x] `docs/PROGRESS.md` updated (Phases 1–9)
- [x] decisions logged (D-06…D-15)

## Self-review
- Route paths from §7.1 kept exactly (incl. `POST /scopes/:id/request-approval` as a functional alias).
- Two process fixes worth flagging: shared Redis rate-limit keys split by prefix; all async middleware wrapped (amw) after a hung-request incident.
- Merge: `--no-ff` into `develop` (no `gh` on this machine).
