import { z } from "zod";

export const checklistSchema = z.object({
  projectId: z.string().min(1).optional(),
  projectType: z.enum(["E_COMMERCE", "SAAS", "MOBILE_APP", "WEBSITE", "CUSTOM"]).optional(),
}).superRefine((v, ctx) => {
  if (!v.projectId && !v.projectType) ctx.addIssue({ code: "custom", message: "projectId or projectType is required" });
});

export const extractSchema = z.object({ submissionId: z.string().min(1) });
export const readinessSchema = z.object({ projectId: z.string().min(1) });
export const acceptanceSchema = z.object({
  requirementIds: z.array(z.string().min(1)).min(1).max(50).optional(),
  scopeVersionId: z.string().min(1).optional(),
  replace: z.boolean().default(false),
}).superRefine((v, ctx) => {
  if (!v.requirementIds?.length && !v.scopeVersionId) ctx.addIssue({ code: "custom", message: "requirementIds or scopeVersionId is required" });
});
export const scopeAnalysisSchema = z.object({ changeRequestId: z.string().min(1) });
export const aiRunIdParam = z.object({ id: z.string().min(1) });
