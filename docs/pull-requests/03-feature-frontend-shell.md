# PR 03 — `feature/frontend-shell` → `develop` (frontend Phases 3–10 + docs + deploy configs)

## Summary
Full frontend: shadcn-style `components/ui` (`components.json`, Tailwind v3 per D-02), typed API client (in-memory token, refresh-once, `ApiError` with codes/details), auth (me/refresh-restore/routing/switcher/logout), React Query + socket cache invalidation, workspace switcher, agency + portal shells (sidebar, bell with unread, mobile sheet nav), guards. Agency: auth ×4, invite, dashboard (recharts KPIs/charts, my-work view), workspaces, members + invitations, settings (typed delete), clients + detail + portal invite, projects + new + 9-tab detail (overview stepper/traceability explorer, requests + AI-suggest, submissions/files, requirements + readiness/clarify/approve, scope builder + versions + compare, dnd-kit Kanban + generate dialog, CR review with AI analysis + approve/reject dialogs, messages, activity), scope version + compare pages, my tasks, notifications, activity, profile. Portal: login, home, project (progress), answer form + multi-file dropzone (direct upload), requirements, scope (approve/reject/changes + signature + history), change requests, messages, notifications.

Also: Playwright webServer config + golden-path (12 steps, 3 contexts, Mailpit invite links, PDF fixture) + negative + mobile specs; full CI (backend-test/e2e/openapi-check/audit jobs); `render.yaml` + `vercel.json` per §12 (compiled worker, `/ready` health, include-dev build); docs 01–15 + DEPLOYMENT.md + README; PDF moved to `docs/requirements/`.

## Test evidence
- Frontend `tsc`: only TS2307 (not-installed modules) + knock-on TS7006 — zero other codes; library API usage verified by hand against real package APIs.
- `npm run lint`: 0 errors, 0 warnings (both workspaces).
- Backend untouched by this branch except lint warning cleanups; `tsc` clean, `openapi:check` 106/106, smoke 70/70 (unchanged code paths).
- Playwright specs typecheck clean; execution happens in CI after `npm install` (no browsers/frontend deps on this machine).

## Checklist
- [x] typecheck green (modulo not-installed modules)
- [x] lint green
- [x] no secrets, no dummy data (all empty states), no stubs/TODOs
- [x] `docs/PROGRESS.md` updated (Phases 10–12)
- [x] decisions logged (D-01…D-15)

## Self-review
- Deleted obsolete prototype routes (portal dashboard/requests/approvals/new, agency standalone tab pages) replaced by the spec paths.
- Multipart uploads + sockets bypass the Next.js proxy deliberately (§3.3); everything else is first-party via rewrites.
- Merge: `--no-ff` into `develop` (no `gh` on this machine).
