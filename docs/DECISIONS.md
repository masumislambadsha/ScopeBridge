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
