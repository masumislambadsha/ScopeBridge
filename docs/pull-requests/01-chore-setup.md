# PR 01 — `chore/setup` → `develop`

## Summary
Phase 0 setup (§14.0). Saves the master spec (`docs/IMPLEMENTATION_SPEC.md`), adopts working conventions (`AGENTS.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md` D-01…D-05), creates `develop`, adds Mailpit to compose, adds root scripts (`typecheck/lint/format/test/test:e2e/build/openapi:export`), ESLint (flat) + Prettier for both apps, CI skeleton (install/typecheck/lint/build/audit; backend-test/e2e/openapi jobs arrive in Phases 1/10), PR + issue templates, `CONTRIBUTING.md`, issue tracker (#1–#58) and project board. Local Postgres/Redis/Mailpit verified running via brew services. Closes #55 (partial — workflow + issues; ERD/schema docs land in Phase 11).

## Test evidence
- `npm run typecheck` → exit 0 (both workspaces).
- `npm run lint` → 0 errors (1 pre-existing unused-import warning in prototype worker code, refactored in Phase 1/2).
- `npm test` → N/A: backend has no test runner yet; vitest + harness arrive in Phase 1 (backend-test CI job added then).
- `pg_isready` → accepting connections; `redis-cli ping` → PONG; Mailpit UI → HTTP 200.

## Checklist
- [x] typecheck green
- [x] lint green (0 errors)
- [ ] test N/A (Phase 1)
- [ ] e2e N/A (Phase 10)
- [x] no secrets committed (`.env` git-ignored; only placeholders in `.env.example`)
- [x] no dummy data/stubs/TODOs
- [x] `docs/PROGRESS.md` updated
- [x] decisions logged (D-01…D-05)

## Self-review
- Root scripts use `--if-present`/`--workspace` so missing phase scripts don't break unrelated commands. Verified `npm run openapi:export` exits cleanly with no script.
- `package-lock.json` churn is from adding eslint/prettier/@eslint/js/typescript-eslint/globals — pinned `@eslint/js@^9` to avoid the v10 peer conflict.
- Merge: `--no-ff` into `develop` (no `gh` on this machine).
