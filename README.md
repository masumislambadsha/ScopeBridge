# ScopeBridge — Client-to-Development Workflow & Scope Management

Traceability: Client Input → Requirement → AI Analysis → Approved Scope → Developer Task → Change Request → AI Scope Analysis → Approval → New Scope Version

## Monorepo
- `frontend/` — Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui → deploy to **Vercel**
- `backend/` — Express + TypeScript + Prisma + Socket.IO + BullMQ → API as **Render Web Service**, worker (`npm run worker`) as **Render Background Worker**
- DB: Neon PostgreSQL · Redis: Render Key Value · Files: Cloudinary · AI: Gemini API

## Quick start (local)
```bash
cp .env.example .env
docker compose up -d
cd backend && npm install && npx prisma migrate dev && npm run dev
# new terminal
cd frontend && npm install && npm run dev
# worker (new terminal)
cd backend && npm run worker
```

## Env
See `.env.example`. Never commit real secrets. All timestamps UTC. All file bytes go to Cloudinary.

## API docs
`GET /api-docs` (Swagger / OpenAPI 3) when backend runs.

## Auth
JWT access 15min (Authorization: Bearer), refresh 7d rotation via httpOnly cookie (`refreshToken`), jti stored in Redis. Argon2 hashing. Rate-limited auth routes.
