# 02 — Target users and roles

## Roles
- **Workspace Admin** — owns the workspace: settings, members/invitations, everything a PM can do.
- **Project Manager (PM)** — runs delivery: clients, projects, information requests, requirements, scope, tasks, change-request review. Triggers AI. (AI only suggests; the PM decides.)
- **Team Member / Developer** — works on assigned tasks in their projects; moves own tasks up to REVIEW.
- **Client (portal)** — answers requests, uploads files, reviews/approves scope with a typed signature, submits change requests, messages the agency, sees progress. **Never sees internal data**: drafts, INTERNAL messages, AI internals, assignees, other clients, members.

## RBAC matrix (enforced by `getProjectAccess`/`getWorkspaceAccess` + `can()`, `backend/src/middleware/access.ts`)

| Permission | Admin | PM | Team Member | Client (own project) |
|---|---|---|---|---|
| Workspace update/delete/settings, member invite/remove/role | ✓ | – | – | – |
| Clients CRUD, portal invite | ✓ | ✓ | read | – |
| Projects create/update/delete/members | ✓ | ✓ | read own projects | read own (DTO) |
| Information requests CRUD + send | ✓ | ✓ | read | read SENT/ANSWERED |
| Submissions + file upload | ✓ | ✓ | read | create own |
| Requirements CRUD/approve/clarify | ✓ | ✓ | read | read non-draft, no aiFlags |
| Scope edit / send for approval | ✓ | ✓ | read | read non-DRAFT |
| Approve/reject/request-changes | – | – | – | ✓ own approvals only |
| Tasks create/assign/delete/generate | ✓ | ✓ | – | progress % only |
| Task status update | ✓ | ✓ | own, up to REVIEW | – |
| CR create | ✓ | ✓ | – | ✓ own |
| CR review/approve/reject | ✓ | ✓ | – | – |
| Messages | all | all | own projects | CLIENT only |
| Trigger AI | ✓ | ✓ | – | – |
| Dashboard/activity | ✓ | ✓ | own view + project activity | portal summary |

Rules: owner can't be removed/demoted; ≥1 admin must remain; `memberId` must belong to the URL workspace; foreign entities return 404 (never leak existence); team reads require project membership.
