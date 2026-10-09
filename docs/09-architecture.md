# 09 — System architecture

```mermaid
flowchart LR
    Browser[Browser] -->|/api/* first-party| Vercel[Vercel: Next.js]
    Browser -->|uploads + sockets direct| API
    Vercel -->|rewrites BACKEND_URL| API[Render: Express API]
    API --> PG[(Neon Postgres\npooled + direct)]
    API --> Redis[(Redis / Key Value)]
    API --> Gem[Gemini API]
    API --> Cloud[Cloudinary]
    API --> SMTP[SMTP / Mailpit]
    Worker[Render: Background Worker] --> Redis
    Worker --> PG
    Worker --> Gem
    Worker --> Cloud
    Worker --> SMTP
    Worker -.->|Redis pub/sub sb:events| API
    API -.->|Socket.IO rooms| Browser
```

- Request flow (heavy work): request → API → queue → Redis → worker → Gemini/email/processing → Postgres → event bus → API → browser.
- Stateless API (JWT + Redis sessions); worker scales horizontally; sockets authorized per project (team/client rooms).
- Local: Next `next dev` (:3000) + API (:4000) + worker + brew/docker Postgres/Redis/Mailpit.
