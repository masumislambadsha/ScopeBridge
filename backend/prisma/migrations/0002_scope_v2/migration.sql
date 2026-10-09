-- AlterEnum
ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';

-- AlterEnum
ALTER TYPE "RequirementSource" ADD VALUE IF NOT EXISTS 'CHANGE_REQUEST';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ScopeVersionStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';

ALTER TYPE "ScopeVersionStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TYPE "ScopeVersionStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';

-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'RECEIVED';
