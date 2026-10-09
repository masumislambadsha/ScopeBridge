# PR 04 — `develop` → `main` (release v1.0.0)

## Summary
Release of the complete ScopeBridge MVP: backend domain modules + access control + AI pipeline + firewall + notifications (PR 02), frontend shells + agency + portal + E2E (PR 03), full CI, all §13 docs, deploy configs. Merged with `--no-ff`; tagged `v1.0.0`.

## Test evidence (cumulative)
- Backend `tsc` clean; `npm run lint` 0 errors/0 warnings (both workspaces).
- Live smoke (`backend/scripts/smoke.ts`, API + worker + PG + Redis + Mailpit, mock AI): **70/70**.
- `openapi:export` (75 paths/106 ops) + `openapi:check` 106/106 documented.
- Vitest suites (9 files) + Playwright specs (golden/negative/mobile) execute in CI after `npm install` —Convex: not runnable on the build machine (no `npm install` per operator instruction, no browsers); specs typecheck clean.

## Remaining human steps (from `docs/DEPLOYMENT.md`)
1. Teammate code review of PRs 01–04 (spec requirement).
2. `npm install` → `npm test` → `npm run test:e2e` → `npm run build` → `npm audit --omit=dev --audit-level=high`.
3. Provision Neon + Redis, deploy Render API + worker + Vercel frontend, public-URL smoke test.

## Checklist
- [x] typecheck/lint green as far as installable
- [x] no secrets, no dummy data, no stubs/TODOs
- [x] docs + board + PROGRESS complete
- [ ] human review + deploy (explicitly out of scope for this machine)
