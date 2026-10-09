import { z } from "zod";
import { paginationSchema } from "../auth/auth.schemas";

export const createProjectSchema = z.object({
  workspaceId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1).max(160),
  description: z.string().max(4000).optional(),
  projectType: z.enum(["E_COMMERCE", "SAAS", "MOBILE_APP", "WEBSITE", "CUSTOM"]).default("CUSTOM"),
  projectTypeLabel: z.string().max(120).optional(),
  startDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
});

export const patchProjectSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(4000).nullable().optional(),
  projectType: z.enum(["E_COMMERCE", "SAAS", "MOBILE_APP", "WEBSITE", "CUSTOM"]).optional(),
  projectTypeLabel: z.string().max(120).nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
});

export const projectsQuerySchema = paginationSchema.extend({
  workspaceId: z.string().min(1),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
  clientId: z.string().optional(),
  search: z.string().optional(),
});

export const projectIdParam = z.object({ id: z.string().min(1) });
export const addProjectMemberSchema = z.object({ userId: z.string().min(1) });
export const projectMemberParam = z.object({ id: z.string().min(1), userId: z.string().min(1) });
