import { z } from "zod";

export const createMessageSchema = z.object({
  projectId: z.string().min(1),
  content: z.string().min(1).max(5000),
  visibility: z.enum(["CLIENT", "INTERNAL"]).default("CLIENT"),
});

export const messagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  projectId: z.string().min(1),
  before: z.string().datetime().optional(),
});
