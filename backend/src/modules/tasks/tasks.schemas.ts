import { z } from "zod";

export const createTaskSchema = z.object({
  projectId: z.string().min(1),
  scopeVersionId: z.string().min(1),
  requirementId: z.string().min(1).optional(),
  changeRequestId: z.string().min(1).optional(),
  assigneeId: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(8000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  deadline: z.string().datetime().optional(),
});

export const patchTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(8000).nullable().optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "COMPLETED"]).optional(),
  deadline: z.string().datetime().nullable().optional(),
});

export const tasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  projectId: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "COMPLETED"]).optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

export const taskIdParam = z.object({ id: z.string().min(1) });

export const generateTasksSchema = z.object({
  onlyNew: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .transform((v) => v === true || v === "true" || v === "1")
    .default(false),
});

export const bulkTasksSchema = z.object({
  scopeVersionId: z.string().min(1),
  tasks: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(8000).optional(),
    requirementId: z.string().min(1).optional(),
    changeRequestId: z.string().min(1).optional(),
    assigneeId: z.string().min(1).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
    deadline: z.string().datetime().optional(),
  })).min(1).max(100),
});
