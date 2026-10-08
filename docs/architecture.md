# ScopeBridge docs

## Traceability
Client Input (Submission) → Requirement → AI Analysis (readiness) → Approved Scope (ScopeVersion + Approval) → Developer Task → Change Request → AI Scope Analysis → Approval → New Scope Version.

## Roles
- ADMIN: full workspace control
- PROJECT_MANAGER: projects, requirements, scope, tasks
- TEAM_MEMBER: assigned tasks
- Client: portal only (requests, approvals, change requests)

## AI features
- AI-01 checklist (sync + hardcoded fallback)
- AI-02 extraction (BullMQ `ai-extraction`, 3 retries exponential; AI_FAILED → notify PM)
- AI-03 readiness (BullMQ `ai-readiness`, flags per requirement)
- AI-04 acceptance criteria / scope draft (BullMQ `ai-scope`, DRAFT only, PM edits)
- AI-05 change analyzer (BullMQ `ai-change-analysis`; PM decides)

All AI output Zod-validated; failures degrade to manual mode.

## Realtime (Socket.IO, JWT handshake)
Rooms `user:<id>`, `project:<id>`. Events: submission:new, ai:extraction:done/failed, ai:scope:ready, approval:requested, scope:approved/rejected, task:assigned, tasks:created, task:updated, change-request:new/analyzed/decided, notification:new, message:new.

## Deployment
- Frontend → Vercel (root `vercel.json`, `frontend/`)
- Backend API → Render Web Service (`npm run migrate:deploy && npm start`)
- Worker → Render Background Worker (`npm run worker`)
- DB → Neon, Redis → Render Key Value, Files → Cloudinary.
