import { z } from "zod";

export const createRequirementSchema = z.object({
  projectId: z.string().min(1),
  submissionId: z.string().min(1).optional(),
  fileId: z.string().min(1).optional(),
  changeRequestId: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(8000).optional(),
  category: z.string().max(80).default("general"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  source: z.enum(["AI", "MANUAL", "CHANGE_REQUEST"]).default("MANUAL"),
  sourceContext: z.string().max(8000).optional(),
  acceptanceCriteria: z.array(z.object({ given: z.string(), when: z.string(), then: z.string() })).default([]),
});

export const patchRequirementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(8000).nullable().optional(),
  category: z.string().max(80).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z.enum(["DRAFT", "NEEDS_CLARIFICATION", "READY", "APPROVED", "REJECTED"]).optional(),
  sourceContext: z.string().max(8000).nullable().optional(),
  acceptanceCriteria: z.array(z.object({ given: z.string(), when: z.string(), then: z.string() })).optional(),
  acceptanceCriteriaStatus: z.enum(["NONE", "AI_DRAFT", "REVIEWED"]).optional(),
});

export const requirementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  projectId: z.string().min(1),
  status: z.enum(["DRAFT", "NEEDS_CLARIFICATION", "READY", "APPROVED", "REJECTED"]).optional(),
  source: z.enum(["AI", "MANUAL", "CHANGE_REQUEST"]).optional(),
  search: z.string().optional(),
});

export const requirementIdParam = z.object({ id: z.string().min(1) });

export const markReadySchema = z.object({
  requirementIds: z.array(z.string().min(1)).min(1).max(50),
  verdict: z.enum(["READY", "NEEDS_CLARIFICATION"]),
});

export const markSchema = z.object({
  projectId: z.string().min(1),
  requirementIds: z.array(z.string().min(1)).min(1).max(50),
  verdict: z.enum(["READY", "NEEDS_CLARIFICATION"]),
});
