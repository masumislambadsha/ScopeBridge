import { z } from "zod";

export const createApprovalSchema = z.object({ scopeVersionId: z.string().min(1) });

export const decideSchema = z.object({
  comment: z.string().max(2000).optional(),
  signatureName: z.string().min(1).max(120),
});

export const requestChangesSchema = z.object({
  comment: z.string().min(1).max(2000),
  signatureName: z.string().min(1).max(120),
});

export const approvalsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  scopeId: z.string().optional(),
  scopeVersionId: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CHANGES_REQUESTED"]).optional(),
});

export const approvalIdParam = z.object({ id: z.string().min(1) });
