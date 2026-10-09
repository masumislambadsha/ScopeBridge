# PROJECT_BOARD.md — Todo / In Progress / Review / Done

## Todo
- Human code review of PRs by teammates (spec requirement).
- `npm install` at root (brings declared deps: jwt9/multer2/vitest/supertest/nodemailer/unpdf/mammoth/pg/frontend libs), then: `npm test`, `npm run test:e2e`, `npm run build`, `npm audit --omit=dev --audit-level=high`.
- Deploy per `docs/DEPLOYMENT.md` (Neon → Render API + worker → Vercel), then public-URL smoke test.

## In Progress
(none — MVP complete pending review/deploy.)

## Review
- PR 01 `chore/setup`, PR 02 `feature/foundation` (backend Phases 1–9), PR 03 `feature/frontend-shell` (Phases 10–12 minus live deploy) — recorded in `docs/pull-requests/`.

## Done
- All 32 feature issues (#1–#32) and all 26 bug issues (#33–#58) implemented and covered (smoke + vitest suites for CI + Playwright specs).
- Definition of Done: everything except credential-dependent deployment steps (see final report in PR 04).
