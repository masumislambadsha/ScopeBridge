# 14 — Setup instructions

## Prereqs
Node 20+, and one of: Docker, or Homebrew (`postgresql@16`, `redis`, `mailpit`).

## Local run (5 minutes)
```bash
# 1. services (pick one)
docker compose up -d
# or: brew services start postgresql@16 redis mailpit

# 2. env (works out of the box for local: mock AI, local storage, Mailpit SMTP)
cp .env.example .env

# 3. backend
cd backend && npm install && npx prisma migrate dev && cd ..

# 4. frontend
cd frontend && npm install && cd ..

# 5. run everything (root): API :4000 + worker + Next :3000
npm run dev
# API alone:  npm run dev --workspace=backend
# Worker:     cd backend && npm run worker
```

## Verify
- `npm run typecheck && npm run lint`
- Backend: `cd backend && npm test` (uses `scopebridge_test`)
- E2E: `cd frontend && npm run test:e2e`
- Smoke (no installs needed beyond root): `npx tsx backend/scripts/smoke.ts` with API+worker running
- OpenAPI: `npm run openapi:export --workspace=backend`, check with `npm run openapi:check --workspace=backend`
- Mailpit UI: http://localhost:8025 · API docs: http://localhost:4000/api-docs
