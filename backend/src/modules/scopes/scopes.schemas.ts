import { z } from "zod";
import { datetimeNullableOptional } from "../../core/zod";

const criterionSchema = z.object({ given: z.string(), when: z.string(), then: z.string() });

const featureSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  requirementIds: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(criterionSchema).default([]),
  changeRequestId: z.string().optional(),
});

export const createScopeSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().max(200).optional(),
});

export const patchVersionSchema = z.object({
  summary: z.string().max(2000).nullable().optional(),
  features: z.array(featureSchema).optional(),
  deliverables: z.array(z.string().max(500)).optional(),
  exclusions: z.array(z.string().max(500)).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  deadline: datetimeNullableOptional,
});

export const scopesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  projectId: z.string().min(1),
});

export const scopeIdParam = z.object({ id: z.string().min(1) });
export const createVersionSchema = z.object({ basedOnVersionId: z.string().min(1).optional() });
export const compareQuerySchema = z.object({ from: z.string().min(1), to: z.string().min(1) });
