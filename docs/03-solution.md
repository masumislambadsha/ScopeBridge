# 03 — Proposed solution, workflow and traceability

## The chain
```
Client Input → Requirement → AI Analysis → Approved Scope (versioned) → Task
→ Change Request → AI Scope Analysis → Human Approval → New Scope Version → New Task
```

## How it works
1. **Intake.** PM sends structured information requests (question builder + AI-suggested questions). The client answers in the portal and uploads files (stored in Cloudinary/local, text-extracted by the `files` queue).
2. **Requirements.** AI-02 extracts DRAFT requirements with codes (`REQ-001`), source excerpts and duplicate flags; AI-03 scores readiness by requirement **code** and stores a `ReadinessReport`. Missing info triggers a clarification loop (CLARIFICATION request → client answers → DRAFT + re-readiness). The PM marks READY and approves (human-only).
3. **Scope.** PM builds features from READY/APPROVED requirements; AI-04 drafts Given/When/Then criteria (AI_DRAFT, never clobbers REVIEWED). Only DRAFT versions are editable. `POST /scopes/:id/versions` copies the latest approved version; `compare` diffs by stable feature id.
4. **Approval.** Sending freezes the version (PENDING_APPROVAL + SHA-256 `contentHash`). The client approves/rejects/requests-changes with a typed signature; the hash is re-verified. Approval cascades: version APPROVED, previous SUPERSEDED, requirements APPROVED, linked CRs resolved. The record is immutable — an approval certificate.
5. **Tasks.** `generate-tasks` previews (optionally `onlyNew`), PM confirms via bulk; every task needs an APPROVED version (`TASK-001`). Kanban + My tasks; team up to REVIEW, PM completes.
6. **Change Request Firewall.** Every CR gets a base approved version (409 with guidance if none), automatic AI-05 analysis (classification + matched items + impact + suggestions), and PM review. IN_SCOPE closes without a version; otherwise a v(n+1) DRAFT is proposed, client-approved, and tasks follow. Tasks can never reference PENDING/UNDER_REVIEW CRs. IMPLEMENTED is automatic when all CR tasks complete.

## Traceability (core USP)
`GET /api/projects/:id/traceability` returns submissions/files → requirements (source context) → versions (status/approvals) → tasks → CRs → resulting versions → CR tasks, plus link maps and a workflow stage (intake → … → completed). The project Overview renders the stepper and a per-requirement explorer.
