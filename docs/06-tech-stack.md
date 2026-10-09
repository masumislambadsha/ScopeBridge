# 06 — Technology stack

| Area | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind v3, shadcn-style `components/ui` (`components.json`), React Query, react-hook-form + zod, sonner, lucide-react, recharts, @dnd-kit, date-fns |
| API | Node.js 24, Express 4, TypeScript |
| DB | PostgreSQL 16 + Prisma 5 (Neon pooled `DATABASE_URL` + direct `DIRECT_URL` in prod) |
| Auth | Argon2id, JWT access 15 min (memory) + rotating refresh 7 d (httpOnly Secure SameSite cookie, jti in Redis) |
| Validation | Zod (backend routes + frontend forms + env) |
| AI | Gemini REST (`x-goog-api-key`), mock provider for tests |
| Realtime | Socket.IO (JWT handshake, team/client rooms) + Redis pub/sub bus (no adapter deps) |
| Jobs | BullMQ 5 (`ai`, `files`, `email`, `reminders`), separate worker process |
| Files | Cloudinary (private/authenticated + signed URLs) or local driver (dev/test, refused in prod) |
| Email | nodemailer-first with built-in SMTP fallback (Mailpit locally) |
| Docs | Swagger UI + generated OpenAPI (`docs/openapi.json`) |
| Tests | Vitest + Supertest (backend), Playwright (E2E) |
| Deploy | Vercel (frontend), Render web + worker (backend), Neon (PG), Key Value/Upstash (Redis) |
| CI | GitHub Actions: typecheck, lint, build, audit, backend tests (PG/Redis/Mailpit services), E2E + report artifact, OpenAPI check |
