# Contributing to ScopeBridge

Spec: `docs/IMPLEMENTATION_SPEC.md`. Conventions: `AGENTS.md`. Progress: `docs/PROGRESS.md`.

## Workflow
1. Branch off `develop`: `feature/<slice>`, `chore/<x>`, `docs/<x>`.
2. Implement vertical slices (backend + UI + permissions + audit + notifications + tests).
3. Keep green: `npm run typecheck`, `npm run lint`, `npm test` (and `npm run test:e2e` once E2E exists).
4. Small Conventional Commits (`feat(scope): …`). Never commit `.env` or secrets. Never force-push `main`/`develop`.
5. Merge into `develop` with `--no-ff` and record the PR in `docs/pull-requests/NN-<branch>.md` (no `gh` on all machines).
6. Update `docs/PROGRESS.md`; log decisions in `docs/DECISIONS.md`.

## Local setup
`brew install postgresql@16 redis mailpit` (or `docker compose up -d`), `brew services start …`, `cp .env.example .env`, backend `npx prisma migrate dev`, then `npm run dev`. Backend tests need Postgres + Redis + Mailpit with `AI_PROVIDER=mock`, `STORAGE_DRIVER=local`.

## Notes
- The spec expects **human code review** of PRs by teammates before release.
- AI never makes final decisions; keep decision statuses human-only.
