import { z } from "zod";

export const createCRSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(8000),
});

export const patchCRSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(8000).optional(),
  status: z.enum(["PENDING", "UNDER_REVIEW"]).optional(),
  estimatedHours: z.number().min(0).max(10000).nullable().optional(),
  estimatedCost: z.number().min(0).nullable().optional(),
  timelineImpactDays: z.number().int().min(0).max(365).nullable().optional(),
  pmNote: z.string().max(4000).nullable().optional(),
});

export const crsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  projectId: z.string().min(1),
  status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "IMPLEMENTED"]).optional(),
});

export const crIdParam = z.object({ id: z.string().min(1) });

export const approveCRSchema = z.object({
  finalClassification: z.enum(["IN_SCOPE", "OUT_OF_SCOPE", "POSSIBLY_RELATED"]),
  createScopeVersion: z.boolean(),
  estimatedHours: z.number().min(0).max(10000).optional(),
  estimatedCost: z.number().min(0).optional(),
  timelineImpactDays: z.number().int().min(0).max(365).optional(),
  note: z.string().max(4000).optional(),
  // When createScopeVersion=true: PM-edited new features for v(n+1).
  newFeatures: z.array(z.object({
    title: z.string().min(1),
    description: z.string().default(""),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
    requirementIds: z.array(z.string()).default([]),
    acceptanceCriteria: z.array(z.object({ given: z.string(), when: z.string(), then: z.string() })).default([]),
  })).default([]),
});

export const rejectCRSchema = z.object({ reason: z.string().min(1).max(2000) });
