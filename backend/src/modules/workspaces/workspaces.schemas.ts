import { z } from "zod";
import { paginationSchema } from "../auth/auth.schemas";

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});

export const patchWorkspaceSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  settings: z.object({
    reminderIntervalDays: z.number().int().min(1).max(30).optional(),
    maxReminders: z.number().int().min(0).max(10).optional(),
    deadlineWarningHours: z.number().int().min(1).max(720).optional(),
  }).optional(),
});

export const workspaceListSchema = paginationSchema;
export const workspaceIdParam = z.object({ id: z.string().min(1) });

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER"]).default("TEAM_MEMBER"),
});

export const patchMemberSchema = z.object({
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER"]),
});

export const memberIdParam = z.object({ id: z.string().min(1), memberId: z.string().min(1) });
