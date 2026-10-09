# 15 — Environment configuration

| Variable | Meaning | Example (local) |
|---|---|---|
| `NODE_ENV` | development\|test\|production | `development` |
| `PORT` | API port | `4000` |
| `DATABASE_URL` | Pooled Postgres URL (Neon pooled in prod) | `postgresql://postgres:postgres@localhost:5432/scopebridge?schema=public` |
| `DIRECT_URL` | Direct Postgres URL (Neon direct in prod; migrations) | same as above locally |
| `REDIS_URL` | Redis (`rediss://` supported) | `redis://localhost:6379` |
| `FRONTEND_URL` | Comma-separated allowed origins | `http://localhost:3000` |
| `BACKEND_PUBLIC_URL` | Public API URL (links) | `http://localhost:4000` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | **Required, ≥32 chars, no fallbacks** | placeholders in `.env.example` |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL_DAYS` | Token lifetimes | `15m` / `7` |
| `AI_PROVIDER` | `gemini`\|`mock` (mock refused in prod) | `mock` |
| `GEMINI_API_KEY` | Required when provider=gemini | `` |
| `GEMINI_MODEL` | Stable Flash model | `gemini-2.5-flash` |
| `STORAGE_DRIVER` | `cloudinary`\|`local` (local refused in prod) | `local` |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | Required when driver=cloudinary | `` |
| `MAIL_ENABLED` | Master email switch | `true` |
| `SMTP_HOST/PORT/USER/PASS/FROM` | SMTP (Mailpit `localhost:1025` locally) | see `.env.example` |
| `RATE_LIMIT_WINDOW_MS/API_MAX/AUTH_MAX/AI_MAX` | Redis-backed limits | `900000/1000/100/60` |
| `BACKEND_URL` | Server-side rewrite target (Vercel) | `http://localhost:4000` |
| `NEXT_PUBLIC_API_URL` | Direct API base (uploads) | `http://localhost:4000` |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO base | `http://localhost:4000` |

`cp .env.example .env` is enough locally. Never commit `.env`. Backend validates env with Zod at boot (fail fast); the frontend needs only `BACKEND_URL` + the two `NEXT_PUBLIC_*` vars.
