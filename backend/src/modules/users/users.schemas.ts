import { z } from "zod";
import { paginationSchema } from "../auth/auth.schemas";

export const usersQuerySchema = paginationSchema.extend({
  workspaceId: z.string().min(1),
  search: z.string().optional(),
});
export const userIdParamSchema = z.object({ id: z.string().min(1) });
export const patchUserSchema = z.object({ name: z.string().min(1).max(100) });
