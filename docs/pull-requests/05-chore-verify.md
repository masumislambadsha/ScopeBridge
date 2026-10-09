# PR 05 — chore/verify: E2E verification fixes + release hardening

**Branch**: `chore/verify` → `develop` → `main`
**Status**: Merged (local `--no-ff`), tag `v1.0.0`

## What this PR does

Fixes all issues found during full-suite E2E verification against a live stack
(API :4100, worker, Next :3000, Postgres, Redis, Mailpit, mock AI).

## Changes

### Real app bugs fixed
- **Portal access**: `portal.service.ts` — added `resolvePortalAccess(userId)` so
  portal routes enforce workspace membership at the service layer (they have no
  `req.access` from middleware).
- **Empty date inputs**: `core/zod.ts` — `datetimeOptional` /
  `datetimeNullableOptional` preprocessors accept `""` from untouched HTML date
  inputs (raw `z.string().datetime()` rejects empty strings).
- **Session resilience**: `lib/api.ts` + `lib/auth.tsx` + `guards.tsx` — access
  token mirrored to `sessionStorage` (D-17), single-flight `sharedRefresh()`,
  `restoreSession()` on load, guards use `hadSession` so transient null doesn't
  bounce to login, session only cleared on final 401 (not network errors).
- **Message composer race**: `messages-tab.tsx` + portal messages page —
  `useRef` seq-guard prevents late mutation `onSuccess` from clearing text typed
  after submit.
- **Task assignment UI**: `tasks-tab.tsx` — PM-only assignee `<Select>` in list
  view (workspace members), `PATCH /api/tasks/:id` on change. Previously tasks
  were bulk-created unassigned with no UI to assign them (FR-20 gap).
- **CR live refresh**: `change-requests-tab.tsx` — `refetchInterval` polls while
  `aiClassification` is null so the AI-05 badge appears without reopening the
  dialog; `lib/socket.tsx` maps `change-request:updated` → `change-request`
  query key.
- **Realtime event**: `change-requests.service.ts` — `emitTeam` on
  `cr.version_proposed` so the scope tab updates live when a v(n+1) draft is
  proposed.

### Test hardening (golden-path / negative specs)
- Strict-duplicate fixes: `.first()`, `exact: true` on tab names, heading-based
  badge assertions (avoid matching hidden `<option>` text).
- Feature title prefill via `addFeature(r.id, r.title)` (backend requires
  non-empty title).
- Tab-visibility assertions after entity creation.
- `pm.reload()` before version dropdown selection (drops stale React Query
  cache).
- AI classification regex matches rendered text (`OUT OF SCOPE` not
  `OUT_OF_SCOPE`).

### Dependency upgrades
- `next` ^15.5, `nodemailer` ^10.0.16, `postcss` override ^8.5.29,
  `@socket.io/redis-emitter` ^5.1.0.

## Verification

| Suite | Result |
|---|---|
| Backend vitest | 35/35 pass |
| Frontend typecheck | clean |
| Frontend lint | 0 errors, 0 warnings |
| Frontend build | success |
| Playwright E2E | 8/8 pass |
| `openapi:check` | 106/106 documented |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |
