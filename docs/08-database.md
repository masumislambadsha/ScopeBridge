# 08 — Database schema

Conventions: `id` cuid PK everywhere; FKs indexed; common filters indexed (status, codes, `createdAt`); unique codes per project (`REQ-001`, `TASK-001`, `CR-001` via atomic `requirementSeq`/`taskSeq`/`crSeq`); unique `(workspaceId,email)` clients, `(workspaceId,userId)` members, `(projectId,userId)` project members, `(scopeId,version)`, `(scopeVersionId,requirementId)`, `(projectId,code)` ×3, `projectId` unique on Scope; `portalUserId` unique + indexed; token hashes unique.

## Models (required fields + relations)
- **User**: name, email† (unique, lower-cased), passwordHash. → ownedWorkspaces, memberships, projectMemberships, createdRequests, scopeVersions, requested/decidedApprovals, assigned/createdTasks, messages, notifications, activityLogs, resetTokens, portalClients, invitations, submissions, files, created/approvedRequirements, CR requester/reviewer/decider, aiRuns.
- **PasswordResetToken**: userId→User (cascade), tokenHash†, expiresAt (1 h, single-use).
- **Workspace**: name, description?, ownerId→User (restrict), settings Json (validated defaults). → members, invitations, clients, projects, logs.
- **WorkspaceMember**: workspaceId→Workspace (cascade), userId→User (cascade), role, joinedAt. †(workspaceId,userId).
- **Invitation**: workspaceId, type (MEMBER|CLIENT_PORTAL), email, role?, clientId?→Client, tokenHash†, invitedById→User, expiresAt (7 d), acceptedAt?, revokedAt?.
- **Client**: workspaceId, name, email, company?, phone?, contactName?, address?, notes?, status, portalUserId?→User (set-null). †(workspaceId,email).
- **Project**: workspaceId, clientId (restrict), name, description?, projectType, projectTypeLabel?, startDate?, deadline?, status, requirementSeq/taskSeq/crSeq (0). → members, IRs, submissions, files, requirements, scope?, tasks, CRs, messages, reports, aiRuns, logs.
- **ProjectMember**: projectId (cascade), userId (cascade), addedAt. †(projectId,userId).
- **InformationRequest**: projectId (cascade), createdById, type (INITIAL|CLARIFICATION), title, description?, questions Json `[{id,question,answerType,options?,required}]`, deadline?, status, sentAt?, lastReminderAt?, reminderCount (0).
- **Submission**: projectId, clientId, submittedById→User, informationRequestId? (set-null), answers Json `{qid: string}`, additionalInfo?, status (RECEIVED default).
- **File**: projectId, submissionId?/changeRequestId? (set-null), uploadedById, originalName, mimeType, size, storageKey, url?, extractionStatus, extractedText? (Text).
- **Requirement**: projectId, code†(project), title, description?, category, priority, status, source (+CHANGE_REQUEST), sourceContext?, submissionId?/fileId?/changeRequestId?/clarificationRequestId? (set-null), acceptanceCriteria Json `[{given,when,then}]`, acceptanceCriteriaStatus, aiFlags?, confidence?, approvedById?/approvedAt?, createdById?.
- **ReadinessReport**: projectId, aiRunId?†, score 0–100, summary?, missingInformation/ambiguous/contradictions/incomplete/unclear/perRequirement Json.
- **Scope**: projectId†, title, approvedVersionId?†.
- **ScopeVersion**: scopeId (cascade), version†(scope), status, summary?, features Json `[{id,title,description,priority,requirementIds[],acceptanceCriteria[],changeRequestId?}]`, deliverables/exclusions Json, priority, deadline?, basedOnVersionId? (self, set-null), createdById, submittedAt?, approvedAt?. DRAFT editable; others immutable; never deleted.
- **ScopeVersionRequirement**: scopeVersionId (cascade), requirementId (cascade). †(pair).
- **Approval**: scopeId/scopeVersionId (cascade), clientId, requestedById, status, decidedById? (set-null), decidedAt?, comment?, signatureName?, contentHash?, ipAddress?, userAgent?. ≤1 PENDING per version (service-enforced). Immutable once decided.
- **Task**: projectId, code†(project), title, description?, requirementId? (set-null), **scopeVersionId required** (restrict, must be APPROVED — firewall), changeRequestId? (set-null, CR must be APPROVED), assigneeId? (set-null), createdById, priority, status, deadline?, completedAt?, deadlineNotifiedAt?.
- **ChangeRequest**: projectId, code†(project), clientId, requestedById, baseScopeVersionId? (set-null, required in practice), title, description, status, clientApprovalStatus, aiClassification?/aiImpact?/aiRationale?/aiMatchedItems?/aiSuggestedRequirements?/aiAnalyzedAt?, finalClassification?, estimatedHours?/estimatedCost?/timelineImpactDays?/pmNote?, reviewedById?/decidedById?/decidedAt?, proposedScopeVersionId?/resultingScopeVersionId? (set-null), implementedAt?.
- **Message**: projectId, senderId, content, visibility (CLIENT default).
- **Notification**: userId, type, title, body?, link?, projectId?, entityId?/entityType?, read, readAt?, emailedAt?.
- **ActivityLog** (append-only): workspaceId, projectId? (set-null), actorId? (set-null), actorType (USER|CLIENT|SYSTEM|AI), action dot.case, entityType, entityId?, metadata?.
- **AiRun**: feature, projectId? (set-null), entityType?/entityId?, status, model?, latencyMs?, error?, output?, createdById?.

Migrations: `0001_init` (frozen) → `0002_scope_v2` (enum additions, idempotent) → `0003_scope_v2_rest` (tables/columns).
