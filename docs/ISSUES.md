# ISSUES.md — tracker (no `gh` on this machine; mirrors GitHub issues)

Format: `#n [type] title` — type: feature | bug | chore | docs. Reference in commits/PRs.

## Features (one per FR group)
- #1 [feature] FR-01 Registration (+ invitation acceptance)
- #2 [feature] FR-02 Login/logout/refresh/forgot/reset + auth pages
- #3 [feature] FR-03 Workspace management + switcher + settings page
- #4 [feature] FR-04 Team invitations (member + portal), roles, members page
- #5 [feature] FR-05 Client CRUD + detail + portal invite
- #6 [feature] FR-06 Projects + members + tabbed detail + traceability overview
- #7 [feature] FR-07 Client portal (projects, DTOs, guards, shells)
- #8 [feature] FR-08 Information requests + questions builder + send + AI suggest
- #9 [feature] FR-09 Submissions (client answers + multi-file)
- #10 [feature] FR-10 Files (storage service, magic bytes, extraction queue, download)
- #11 [feature] FR-11 Requirements (approve, clarification loop, table + drawer)
- #12 [feature] AI-02 extraction pipeline
- #13 [feature] AI-03 readiness + readiness panel
- #14 [feature] FR-14 Scope builder + FR-16 versioning/compare
- #15 [feature] AI-04 acceptance criteria (AI_DRAFT/REVIEWED)
- #16 [feature] FR-17 Approval flow + request-changes + FR-18 certificate
- #17 [feature] FR-19 Task generation preview + bulk confirm
- #18 [feature] FR-20 Kanban + list + my tasks + status rules
- #19 [feature] FR-21 CR creation + base version + auto AI-05
- #20 [feature] FR-22 Firewall enforcement + tests
- #21 [feature] AI-05 analyzer output + PM override UI
- #22 [feature] FR-24 CR review/approve/reject + FR-25 v2 propagation
- #23 [feature] FR-26 Messages (visibility, realtime, pagination, unread)
- #24 [feature] FR-27 Notifications matrix + bell + pages
- #25 [feature] FR-28 Reminder scheduler (idempotent, SYSTEM-audited)
- #26 [feature] FR-29 Audit trail (audit() everywhere + activity UI)
- #27 [feature] FR-30 Dashboard analytics + traceability endpoint/UI
- #28 [feature] AI-01 checklist + templates + IR integration
- #29 [feature] OpenAPI from Zod + export + completeness CI check
- #30 [feature] E2E golden path + negative + mobile smoke
- #31 [feature] Docs 01–15 + DEPLOYMENT.md + ERD/diagrams
- #32 [chore] Deployment configs + release v1.0.0

## Bugs (spec §2.2, one per defect)
- #33 [bug] D01 invalid body crashes API (async wrapper + validate everywhere)
- #34 [bug] D02 approvals lack authorization + PENDING checks + scoping
- #35 [bug] D03 cross-workspace leaks (tasks, CRs, users list/detail)
- #36 [bug] D04 member routes: cross-workspace act, no list check, owner/last-admin
- #37 [bug] D05 socket project:join without access check
- #38 [bug] D06 worker realtime never reaches browsers (redis emitter)
- #39 [bug] D07 portal non-functional (access path, DTOs, clientId)
- #40 [bug] D08 clientId from body unverified (submissions, CRs)
- #41 [bug] D09 CR: no version on accept, empty AI base, ignored req.file
- #42 [bug] D10 scope: APPROVED bypass, empty v1 snapshot, AI overwrites edits
- #43 [bug] D11 AI-02 reads URL string only; /ai/extract stub
- #44 [bug] D12 AI-03 wrong order (ACCEPTED), title matching, no failure handling
- #45 [bug] D13 reminders never scheduled; no email; reset token leaked
- #46 [bug] D14 audit trail has 3 actions only
- #47 [bug] D15 tasks without approved scope; hardcoded UI data
- #48 [bug] D16 hardcoded JWT secret fallbacks
- #49 [bug] D17 retired Gemini model + key in URL
- #50 [bug] D18 jsonwebtoken@8 + multer@1 vulnerabilities
- #51 [bug] D19 render build skips devDeps; worker via tsx
- #52 [bug] D20 frontend: no shadcn, raw JSON, no guards/logout, missing screens, socket staleness
- #53 [bug] D21 Swagger documents 1 route only
- #54 [bug] D22 Playwright has 4 heading tests only
- #55 [bug] D23 no develop/branches/PRs/issues/docs
- #56 [bug] D24 upload validation gaps (doc/txt fallback, webp, metadata)
- #57 [bug] D25 RBAC only on workspace routes
- #58 [bug] D26 approval lacks decider + integrity
