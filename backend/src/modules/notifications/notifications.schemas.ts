import { z } from "zod";

export const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread: z.enum(["0", "1"]).optional(),
});

export const notificationIdParam = z.object({ id: z.string().min(1) });

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
});
