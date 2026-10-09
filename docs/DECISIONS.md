# DECISIONS.md — decision log

One short entry each: context → decision → consequence.

## D-01 — Local services via Homebrew, compose kept for CI/teammates
Context: no Docker daemon on this machine; brew Postgres present, Redis/Mailpit installable via brew.
Decision: run Postgres/Redis/Mailpit as brew services locally; still add Mailpit to `docker-compose.yml` for CI and other machines.
Consequence: `docker compose up -d` works where Docker exists; local dev here uses brew services on the same ports (5432/6379/1025/8025).

## D-02 — shadcn/ui on Tailwind v3
Context: spec §8 allows Tailwind v4 migration or a Tailwind-v3-compatible shadcn CLI.
Decision: stay on Tailwind v3 and use the shadcn CLI release that supports Tailwind v3.
Consequence: no CSS/config migration churn; `components.json` targets the existing Tailwind setup.

## D-03 — Response envelope migration
Context: prototype returns `{ data, pagination }`; spec §3.2 mandates `{ success, data, meta }` / `{ success:false, error:{code…} }`.
Decision: backend adopts the spec envelope in Phase 1; frontend migrates slice-by-slice as pages are rebuilt.
Consequence: temporary mixed envelopes during Phases 1–2; consistent by Phase 3.

## D-04 — Queue and event names follow the spec
Context: prototype queues (`ai-extraction`, …) and ad-hoc socket events differ from §3.5/§3.6.
Decision: adopt spec names (`ai`, `files`, `email`, `reminders` queues; `ai:run:updated`, `scope:version:updated`, … events) from Phase 1/2 onward.
Consequence: worker/API/frontend move together; no backward compat with prototype event names.

## D-05 — GEMINI_MODEL resolved via ListModels
Context: `gemini-1.5-flash` is retired; spec requires verifying a stable Flash model.
Decision: call ListModels (`x-goog-api-key` header) before implementing AI; record the chosen default in `docs/05-ai.md`. Tests always use `AI_PROVIDER=mock`.
Consequence: no runtime surprises from retired models; AI code paths testable without a key.

## D-06 — GEMINI_MODEL default is gemini-2.5-flash
Context: `gemini-1.5-*` retired; model docs (Oct 2026) list `gemini-2.5-flash` as the stable Flash endpoint.
Decision: default `GEMINI_MODEL=gemini-2.5-flash`, overridable via env. Key sent via `x-goog-api-key` header, never URL.
Consequence: works with current keys; tests use `AI_PROVIDER=mock` regardless.

## D-07 — Dedicated test database via globalSetup
Context: backend tests need real Postgres+Redis without touching dev data.
Decision: `TEST_DATABASE_URL` (`scopebridge_test`), created + `migrate deploy` in vitest `globalSetup`; per-worker env in `setupFiles`.
Consequence: hermetic backend suite locally and in CI.

## D-08 — Local Zod→JSON-Schema converter for OpenAPI
Context: spec suggests `@asteasolutions/zod-to-openapi`, but minimizing new hard dependencies keeps `openapi:export` runnable everywhere.
Decision: `backend/src/openapi/zodToJsonSchema.ts` converts our Zod subset; registry maps every route.
Consequence: `npm run openapi:export` works with the installed tree; CI completeness check compares router stack vs registry.

## D-09 — Mailer with nodemailer-first, raw-SMTP fallback
Context: nodemailer may be absent from a given install; Mailpit speaks plain SMTP.
Decision: `services/mailer.ts` dynamic-imports nodemailer; on failure uses a minimal built-in SMTP client (EHLO/AUTH-LOGIN/DATA, no TLS).
Consequence: email works locally without extra deps; production uses nodemailer with TLS/auth after `npm install`.

## D-10 — Custom Redis pub/sub event bus for realtime
Context: worker must reach browsers but `@socket.io/redis-adapter/emitter` add deps and version coupling.
Decision: worker publishes `{ room, event, payload }` on Redis channel `sb:events`; every API instance subscribes and forwards to Socket.IO rooms.
Consequence: works single- and multi-instance with only ioredis; adapter packages remain optional.

## D-11 — File text extraction with graceful degradation
Context: `unpdf`/`mammoth` may be absent; DOCX is a zip (inflatable via node:zlib), PDFs often carry Flate streams.
Decision: dynamic-import `unpdf`/`mammoth` when installed; else manual DOCX zip-parse and best-effort PDF stream decode; DOC/images → UNSUPPORTED.
Consequence: extraction works without new deps for common files; Gemini still receives PDFs/images as inline parts.

## D-12 — Distinct Redis prefixes per rate limiter
Context: all limiters shared the default `rl:` key, so the AI limiter tripped on total traffic.
Decision: `rl-api:`, `rl-auth:`, `rl-ai:` prefixes.
Consequence: limits are independent and observable in Redis.

## D-13 — amw() wrapper for every async middleware
Context: Express 4 drops async middleware throws → unhandled rejection → hung requests (found via approve hang).
Decision: `amw()` in core/http wraps requireProjectAccess/requireWorkspaceAccess/requireEntityAccess/requireClientAccess and custom one-off middlewares.
Consequence: auth/access failures always return 403/404 envelopes, never hang.

## D-14 — BullMQ custom jobIds avoid colons (except legacy 3-part form)
Context: BullMQ rejects custom IDs containing `:` unless split(':').length === 3.
Decision: dash-joined jobIds; enqueue failures mark the AiRun FAILED (no orphaned QUEUED runs).
Consequence: deterministic ids, no silent queue failures.

## D-15 — Mock AI derives requirement codes from the prompt
Context: fixtures must reference real entities for processor tests and smoke runs.
Decision: mock extracts `[A-Z]+-\d+` codes from input for readiness/acceptance fixtures; extraction stays a fixed valid fixture.
Consequence: deterministic, code-linked fixtures exercising every path.

## D-17 — Access token mirrored in sessionStorage
Context: the token lives in module memory, so every full-page navigation wiped it and forced a refresh roundtrip; concurrent post-reload 401s raced the single-use refresh token and flaked E2E/client reads.
Decision: mirror the access token in tab-scoped sessionStorage (survives reloads, dies with the tab); cleared on logout and on final 401. Never localStorage.
Consequence: reloads reuse the live token with zero roundtrips; refresh is now a rare path (expiry/multi-tab), still single-flight.
