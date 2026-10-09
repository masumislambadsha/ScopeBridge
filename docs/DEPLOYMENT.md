# DEPLOYMENT.md — environments and remaining human steps

> No public URLs exist yet: the Vercel/Render/Neon CLIs are not authenticated on the build
> machine, and **URLs are never invented**. Everything below is the exact click path a human
> follows; the app is fully configured for it (`render.yaml`, `vercel.json`, `docs/15-environment.md`).

## 1. Postgres (Neon)
1. Create a Neon project → copy the **pooled** connection string (`...-pooler...`) and the **direct** one.
2. Set `DATABASE_URL` = pooled, `DIRECT_URL` = direct (Render API + worker env).
3. Migrations run automatically on API boot (`prisma migrate deploy` in `startCommand`).

## 2. Redis (Render Key Value or Upstash)
1. Create the instance → copy the connection URL (`rediss://…` supported; BullMQ keeps `maxRetriesPerRequest: null`).
2. Set `REDIS_URL` on API + worker.

## 3. Backend API (Render Web Service, `render.yaml` already defines it)
1. New → Web Service → connect the repo → Render reads `render.yaml`.
2. Root directory `backend`; build `npm ci --include=dev && npx prisma generate && npm run build`; start `npx prisma migrate deploy && node dist/index.js`; health check `/ready`.
3. Fill env vars (table below). `FRONTEND_URL` = the Vercel domain(s), comma-separated. Cookies are Secure in production; CORS allows only those origins.

## 4. Worker (Render Background Worker)
Same repo/service definition (`scopebridge-worker`): same build; start `node dist/workers/worker.js` (compiled — never tsx in prod).

## 5. Frontend (Vercel)
1. Import the repo → root directory `frontend` (or use root `vercel.json`).
2. Env: `BACKEND_URL` = `https://<api>.onrender.com` (server rewrites `/api/*` → it, keeping the refresh cookie first-party); `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_SOCKET_URL` = same API origin (uploads + sockets go direct).
3. Deploy; set the Vercel domain back into Render's `FRONTEND_URL`.

## 6. Smoke test the public URLs
Register → create workspace → invite member → create client → portal invite → new project → send IR → answer + upload → requirements → readiness → scope v1 → approve → tasks → change request → v2 → approve → implemented. Then mark [DoD deployment boxes](#) done.

## Production env table (Render API + worker; Vercel needs only the last 3)
`NODE_ENV=production`, `DATABASE_URL` (pooled), `DIRECT_URL` (direct), `REDIS_URL`, `FRONTEND_URL` (Vercel domain), `BACKEND_PUBLIC_URL`, `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` (≥32 random chars), `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.5-flash`, `STORAGE_DRIVER=cloudinary` + `CLOUDINARY_*`, `MAIL_ENABLED=true` + `SMTP_*` (provider relay), Vercel: `BACKEND_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`.
