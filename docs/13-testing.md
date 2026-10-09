# 13 — Testing strategy

## Backend (Vitest + Supertest, real Postgres + Redis, `AI_PROVIDER=mock`, `STORAGE_DRIVER=local`)
- Run: ensure PG/Redis/Mailpit up → `cd backend && npm test` (globalSetup creates `scopebridge_test` + `migrate deploy`).
- Suites: `health` (ops endpoints + envelope), `fuzz` (every route vs `{}`/malformed → 400/401, server stays alive — D01), `rbac` (§3.4 matrix sweep), `isolation` (cross-workspace 404 per resource + scoped users), `firewall` (no task without APPROVED version/CR + 409 guidance), `approvals` (client-only, once-only, hash-tamper, immutability), `cr-flow` (v2→SUPERSEDED→IMPLEMENTED + AI decision rule), `ai-failure` (MOCK_AI_FAIL → FAILED + AI_FAILED + PM notify), `reminders` (idempotent counters + SYSTEM audit).
- Live verification without installs: `backend/scripts/smoke.ts` (tsx) — 70 assertions over the full golden path.

## E2E (Playwright, mock AI, Mailpit)
- Run: `cd frontend && npm run test:e2e` (webServer boots API :4100 + worker + `next start :3000` against the test DB).
- `golden-path.spec.ts`: 12-step PM+client+team flow incl. Mailpit invite links, PDF upload, clarification loop, certificate, Wishlist CR → v2 → IMPLEMENTED, dashboard + activity assertions.
- `negative.spec.ts`: INTERNAL invisibility, agency-route bounce, unauthenticated bounce.
- `mobile.spec.ts` (Pixel 7): main pages render, no horizontal page scroll, sheet nav works.

## CI (`.github/workflows/ci.yml`)
install → typecheck → lint → build → audit(high) → backend-test (services) → openapi-check (+ drift check on `docs/openapi.json`) → e2e (+ report artifact).
