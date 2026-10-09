-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('E_COMMERCE', 'SAAS', 'MOBILE_APP', 'WEBSITE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('MEMBER', 'CLIENT_PORTAL');

-- CreateEnum
CREATE TYPE "InformationRequestType" AS ENUM ('INITIAL', 'CLARIFICATION');

-- CreateEnum
CREATE TYPE "FileExtractionStatus" AS ENUM ('PENDING', 'EXTRACTED', 'UNSUPPORTED', 'FAILED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AcceptanceCriteriaStatus" AS ENUM ('NONE', 'AI_DRAFT', 'REVIEWED');

-- CreateEnum
CREATE TYPE "ClientApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('CHECKLIST', 'EXTRACTION', 'READINESS', 'ACCEPTANCE_CRITERIA', 'SCOPE_CHANGE');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageVisibility" AS ENUM ('CLIENT', 'INTERNAL');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'CLIENT', 'SYSTEM', 'AI');

-- AlterEnum
BEGIN;

CREATE TYPE "ChangeRequestStatus_new" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED');

ALTER TABLE "ChangeRequest" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "ChangeRequest" ALTER COLUMN "status" TYPE "ChangeRequestStatus_new" USING ("status"::text::"ChangeRequestStatus_new");

ALTER TYPE "ChangeRequestStatus" RENAME TO "ChangeRequestStatus_old";

ALTER TYPE "ChangeRequestStatus_new" RENAME TO "ChangeRequestStatus";

DROP TYPE "ChangeRequestStatus_old";

ALTER TABLE "ChangeRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';

COMMIT;

-- AlterEnum
BEGIN;

CREATE TYPE "RequirementStatus_new" AS ENUM ('DRAFT', 'NEEDS_CLARIFICATION', 'READY', 'APPROVED', 'REJECTED');

ALTER TABLE "Requirement" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Requirement" ALTER COLUMN "status" TYPE "RequirementStatus_new" USING ("status"::text::"RequirementStatus_new");

ALTER TYPE "RequirementStatus" RENAME TO "RequirementStatus_old";

ALTER TYPE "RequirementStatus_new" RENAME TO "RequirementStatus";

DROP TYPE "RequirementStatus_old";

ALTER TABLE "Requirement" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

COMMIT;

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_actorId_fkey";

-- DropForeignKey
ALTER TABLE "ChangeRequest" DROP CONSTRAINT "ChangeRequest_scopeVersionId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_scopeVersionId_fkey";

-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_ownerId_fkey";

-- DropIndex
DROP INDEX "Client_workspaceId_email_idx";

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "actorType" "ActorType" NOT NULL DEFAULT 'USER',
ALTER COLUMN "actorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Approval" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "decidedById" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "signatureName" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "ChangeRequest" DROP COLUMN "fileUrl",
DROP COLUMN "scopeVersionId",
ADD COLUMN     "aiAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "aiMatchedItems" JSONB,
ADD COLUMN     "aiSuggestedRequirements" JSONB,
ADD COLUMN     "baseScopeVersionId" TEXT,
ADD COLUMN     "clientApprovalStatus" "ClientApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "decidedById" TEXT,
ADD COLUMN     "estimatedCost" DECIMAL(65,30),
ADD COLUMN     "estimatedHours" DOUBLE PRECISION,
ADD COLUMN     "finalClassification" "AiClassification",
ADD COLUMN     "implementedAt" TIMESTAMP(3),
ADD COLUMN     "pmNote" TEXT,
ADD COLUMN     "proposedScopeVersionId" TEXT,
ADD COLUMN     "requestedById" TEXT NOT NULL,
ADD COLUMN     "resultingScopeVersionId" TEXT,
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "timelineImpactDays" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "InformationRequest" ADD COLUMN     "lastReminderAt" TIMESTAMP(3),
ADD COLUMN     "reminderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "type" "InformationRequestType" NOT NULL DEFAULT 'INITIAL';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "visibility" "MessageVisibility" NOT NULL DEFAULT 'CLIENT';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "emailedAt" TIMESTAMP(3),
ADD COLUMN     "link" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "crSeq" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "projectType" "ProjectType" NOT NULL DEFAULT 'CUSTOM',
ADD COLUMN     "projectTypeLabel" TEXT,
ADD COLUMN     "requirementSeq" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taskSeq" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Requirement" ADD COLUMN     "acceptanceCriteriaStatus" "AcceptanceCriteriaStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "changeRequestId" TEXT,
ADD COLUMN     "clarificationRequestId" TEXT,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "fileId" TEXT,
ADD COLUMN     "sourceContext" TEXT,
DROP COLUMN "priority",
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "Scope" DROP COLUMN "deadline",
DROP COLUMN "deliverables",
DROP COLUMN "exclusions",
DROP COLUMN "features",
DROP COLUMN "source",
DROP COLUMN "status",
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Project Scope';

-- AlterTable
ALTER TABLE "ScopeVersion" DROP COLUMN "snapshot",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "basedOnVersionId" TEXT,
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "deliverables" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "exclusions" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "features" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "filePublicId",
DROP COLUMN "fileUrl",
ADD COLUMN     "additionalInfo" TEXT,
ADD COLUMN     "submittedById" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'RECEIVED';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "changeRequestId" TEXT,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "deadlineNotifiedAt" TIMESTAMP(3),
ALTER COLUMN "scopeVersionId" SET NOT NULL,
DROP COLUMN "priority",
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "settings" JSONB NOT NULL DEFAULT '{}';

-- DropEnum
DROP TYPE "RequirementPriority";

-- DropEnum
DROP TYPE "ScopeSource";

-- DropEnum
DROP TYPE "ScopeStatus";

-- DropEnum
DROP TYPE "TaskPriority";

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "InvitationType" NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole",
    "clientId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "submissionId" TEXT,
    "changeRequestId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "extractionStatus" "FileExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "extractedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadinessReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "aiRunId" TEXT,
    "score" INTEGER NOT NULL,
    "summary" TEXT,
    "missingInformation" JSONB NOT NULL DEFAULT '[]',
    "ambiguous" JSONB NOT NULL DEFAULT '[]',
    "contradictions" JSONB NOT NULL DEFAULT '[]',
    "incomplete" JSONB NOT NULL DEFAULT '[]',
    "unclear" JSONB NOT NULL DEFAULT '[]',
    "perRequirement" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadinessReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScopeVersionRequirement" (
    "id" TEXT NOT NULL,
    "scopeVersionId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,

    CONSTRAINT "ScopeVersionRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRun" (
    "id" TEXT NOT NULL,
    "feature" "AiFeature" NOT NULL,
    "projectId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "status" "AiRunStatus" NOT NULL DEFAULT 'QUEUED',
    "model" TEXT,
    "latencyMs" INTEGER,
    "error" TEXT,
    "output" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AiRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_workspaceId_idx" ON "Invitation"("workspaceId");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_clientId_idx" ON "Invitation"("clientId");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE INDEX "File_projectId_idx" ON "File"("projectId");

-- CreateIndex
CREATE INDEX "File_submissionId_idx" ON "File"("submissionId");

-- CreateIndex
CREATE INDEX "File_changeRequestId_idx" ON "File"("changeRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadinessReport_aiRunId_key" ON "ReadinessReport"("aiRunId");

-- CreateIndex
CREATE INDEX "ReadinessReport_projectId_idx" ON "ReadinessReport"("projectId");

-- CreateIndex
CREATE INDEX "ReadinessReport_projectId_createdAt_idx" ON "ReadinessReport"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ScopeVersionRequirement_scopeVersionId_idx" ON "ScopeVersionRequirement"("scopeVersionId");

-- CreateIndex
CREATE INDEX "ScopeVersionRequirement_requirementId_idx" ON "ScopeVersionRequirement"("requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "ScopeVersionRequirement_scopeVersionId_requirementId_key" ON "ScopeVersionRequirement"("scopeVersionId", "requirementId");

-- CreateIndex
CREATE INDEX "AiRun_projectId_idx" ON "AiRun"("projectId");

-- CreateIndex
CREATE INDEX "AiRun_feature_status_idx" ON "AiRun"("feature", "status");

-- CreateIndex
CREATE INDEX "AiRun_entityType_entityId_idx" ON "AiRun"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_projectId_createdAt_idx" ON "ActivityLog"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequest_projectId_code_key" ON "ChangeRequest"("projectId", "code");

-- CreateIndex
CREATE INDEX "Client_portalUserId_idx" ON "Client"("portalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_workspaceId_email_key" ON "Client"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "Requirement_changeRequestId_idx" ON "Requirement"("changeRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Requirement_projectId_code_key" ON "Requirement"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Scope_projectId_key" ON "Scope"("projectId");

-- CreateIndex
CREATE INDEX "ScopeVersion_scopeId_status_idx" ON "ScopeVersion"("scopeId", "status");

-- CreateIndex
CREATE INDEX "Task_changeRequestId_idx" ON "Task"("changeRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_projectId_code_key" ON "Task"("projectId", "code");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_clarificationRequestId_fkey" FOREIGN KEY ("clarificationRequestId") REFERENCES "InformationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadinessReport" ADD CONSTRAINT "ReadinessReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadinessReport" ADD CONSTRAINT "ReadinessReport_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "AiRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeVersion" ADD CONSTRAINT "ScopeVersion_basedOnVersionId_fkey" FOREIGN KEY ("basedOnVersionId") REFERENCES "ScopeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeVersionRequirement" ADD CONSTRAINT "ScopeVersionRequirement_scopeVersionId_fkey" FOREIGN KEY ("scopeVersionId") REFERENCES "ScopeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeVersionRequirement" ADD CONSTRAINT "ScopeVersionRequirement_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_scopeVersionId_fkey" FOREIGN KEY ("scopeVersionId") REFERENCES "ScopeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_baseScopeVersionId_fkey" FOREIGN KEY ("baseScopeVersionId") REFERENCES "ScopeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_proposedScopeVersionId_fkey" FOREIGN KEY ("proposedScopeVersionId") REFERENCES "ScopeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_resultingScopeVersionId_fkey" FOREIGN KEY ("resultingScopeVersionId") REFERENCES "ScopeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
