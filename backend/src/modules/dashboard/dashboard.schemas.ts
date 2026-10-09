import { z } from "zod";

export const analyticsQuerySchema = z.object({
  workspaceId: z.string().min(1),
});
