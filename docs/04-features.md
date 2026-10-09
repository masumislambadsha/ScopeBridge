# 04 — Core features (FR-01…FR-30 + traceability)

| FR | What | Backend | Frontend |
|---|---|---|---|
| 01 Registration | argon2id, auto sign-in, inviteToken acceptance | `modules/auth/*` | `/register`, `/invite/[token]` |
| 02 Login etc. | JWT, logout, refresh rotation, reset via email (always 200, single-use hash) | `modules/auth/*` | `/login`, `/forgot-password`, `/reset-password` |
| 03 Workspaces | CRUD, settings (validated), typed-delete, isolation | `modules/workspaces/*` | `/workspaces`, `/settings/workspace`, shell switcher |
| 04 Members | invitations (MEMBER), roles, pending list, resend-by-relink, revoke, owner/last-admin rules | `modules/invitations/*`, `workspaces.service` | `/settings/members`, `/invite/[token]` |
| 05 Clients | full fields, search, portal-invite → `portalUserId` | `modules/clients/*` | `/clients`, `/clients/[id]` |
| 06 Projects | types, members, COMPLETED warnings, 9-tab detail | `modules/projects/*` | `/projects`, `/projects/new`, `/projects/[id]` |
| 07 Portal | own layout/guards, DTOs, progress | `modules/portal/*` | `/portal/**` (8 pages) |
| 08 Info requests | builder (4 answer types), DRAFT→SENT→ANSWERED→CLOSED, send + email, AI-suggest | `modules/information-requests/*` | project Requests tab |
| 09 Submissions | per-question answers + info + multi-file, clientId from access, ANSWERED, PM notify, auto AI-02 | `modules/submissions/*` | portal request page |
| 10 Files | 7 types, real magic bytes, 10×10MB, File rows, extraction queue, access-checked download | `modules/files/*`, `services/storage.ts`, `workers/processors/files.processor.ts` | Submissions tab, portal dropzone |
| 11 Requirements | codes, approve endpoint, clarification loop, delete-guard, table + drawer + bulk + readiness panel | `modules/requirements/*` | Requirements tab |
| 12 AI-02 | auto + manual 202, excerpts verified, duplicates flagged | `workers/processors/ai.processor.ts` | — (results in Requirements) |
| 13 AI-03 | code-based, report + aiFlags, suggest-only + bulk apply | `workers/processors/ai.processor.ts` | readiness panel |
| 14 Scope | from READY/APPROVED reqs, features+deliverables+exclusions, v1 DRAFT, sticky send | `modules/scopes/*` | Scope tab, builder |
| 15 AI-04 | 2–6 criteria, AI_DRAFT, REVIEWED protection + replace flag | `workers/processors/ai.processor.ts` | Scope tab |
| 16 Versioning | immutable non-drafts, single-open guard, basedOn copy, links rebuilt, compare diff (+page) | `modules/scopes/*` | history, `/scope/compare` |
| 17 Approval | freeze+hash, 3 client decisions, cascades, history | `modules/approvals/*` | agency history, portal scope |
| 18 Certificate | decider, signature, IP/UA, hash, immutable | `modules/approvals/*` | certificate panels |
| 19 Generation | preview (+onlyNew), PM edit/split, bulk confirm, codes, links | `modules/tasks/*` | Tasks tab dialog |
| 20 Tasks | dnd-kit Kanban + list + filters, team ceiling, My tasks, completedAt | `modules/tasks/*` | Tasks tab, `/tasks` |
| 21 CRs | base version auto, 409 guidance, files, auto AI-05 | `modules/change-requests/*` | portal CR page, Changes tab |
| 22 Firewall | APPROVED-version + APPROVED-CR gates (single + bulk) + tests | `modules/tasks/*`, `tests/firewall.test.ts` | — (enforced API-side) |
| 23 AI-05 UI | badge, matches, impact breakdown, rationale, PM override | `workers/processors/ai.processor.ts` | Changes tab review dialog |
| 24 CR review | PENDING→UNDER_REVIEW→APPROVED/REJECTED→IMPLEMENTED, both approve paths, reason required | `modules/change-requests/*` | Changes tab dialogs |
| 25 v2 update | SUPERSEDED chain, CR resolution, onlyNew prompt | `modules/approvals/*` | Scope tab, Changes tab |
| 26 Messages | CLIENT/INTERNAL, realtime, load-older, unread via notifications | `modules/messages/*` | Messages tab, portal messages |
| 27 Notifications | matrix notify(), bell + dropdown counts, page, read-all | `services/notify.ts`, `modules/notifications/*` | shells, `/notifications` |
| 28 Reminders | hourly scheduler, IR/approval/task rules, idempotent, SYSTEM audit | `workers/processors/reminders.processor.ts` | — (email + in-app) |
| 29 Audit | audit() everywhere, before/after, append-only, filters | `services/audit.ts` | Activity tab, `/activity` |
| 30 Dashboard | counts + series + deadlines + activity; my-work for team; portal summary | `modules/dashboard/*` | `/dashboard` (recharts) |
| Trace | chain endpoint + stepper + explorer | `modules/traceability/*` | Overview tab |
