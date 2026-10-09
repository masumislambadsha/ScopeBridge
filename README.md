# ScopeBridge — Client-to-Development Workflow & Scope Management

Turn scattered client input into one traceable chain:

```
Client Input → Requirement → AI Analysis → Approved Scope (versioned) → Task
→ Change Request → AI Scope Analysis → Human Approval → New Scope Version → New Task
```

The **Change Request Firewall** guarantees no client change becomes development work without analysis, human approval, and a new approved scope version. Scope creep stops being a revenue leak.

## Features
- Agency workspace with roles (Admin / PM / Team Member), invitations, clients + portal invites
- Projects with a 9-tab command center (overview stepper + traceability explorer, requests, submissions & files, requirements, scope builder, Kanban, change requests, messages, activity)
- Client portal: answer requests + upload files, review/approve scopes with typed signatures, submit change requests, track progress
- 5 Gemini AI features (mock provider for tests): checklist, extraction, readiness, acceptance criteria, change analysis — AI suggests, **humans decide**
- Versioned scopes with diffs, hash-verified immutable approvals, task firewall, reminders, notifications, realtime, audit trail, analytics

## Monorepo
- `frontend/` — Next.js 14 App Router + TS + Tailwind + shadcn-style UI → **Vercel**
- `backend/` — Express 4 + TS + Prisma + Socket.IO + BullMQ → **Render** web service + background worker (`node dist/workers/worker.js`)
- DB: Neon PostgreSQL · Redis: Key Value/Upstash · Files: Cloudinary (local driver for dev/test) · AI: Gemini · Email: SMTP/Mailpit

## Quick start (local)
```bash
docker compose up -d            # postgres + redis + mailpit (or brew services)
cp .env.example .env            # works out of the box: mock AI, local storage, Mailpit
cd backend && npm install && npx prisma migrate dev && cd ..
cd frontend && npm install && cd ..
npm run dev                     # API :4000 + worker + Next :3000
```

## Verify
```bash
npm run typecheck && npm run lint
cd backend && npm test                       # vitest+supertest (scopebridge_test)
cd frontend && npm run test:e2e              # playwright golden path + negative + mobile
npx tsx backend/scripts/smoke.ts             # 70-assertion live smoke (no installs needed)
npm run openapi:export --workspace=backend   # docs/openapi.json
```

## Docs
Spec: `docs/IMPLEMENTATION_SPEC.md` · progress: `docs/PROGRESS.md` · decisions: `docs/DECISIONS.md` ·
`docs/01-problem.md` … `docs/15-environment.md`, `docs/DEPLOYMENT.md`, `docs/ARCHITECTURE` in `09-architecture.md`, ERD in `07-erd.md`, API structure in `11-api-structure.md`, Swagger UI at `/api-docs` when the API runs.

## Auth & security
Argon2id · JWT access 15 min (in-memory) + rotating refresh 7 d (httpOnly Secure SameSite cookie, Redis jti) · RBAC matrix in `docs/02-users-roles.md` · workspace isolation (foreign entities → 404) · Zod everywhere · Redis rate limits · magic-byte uploads · no secrets in git.
