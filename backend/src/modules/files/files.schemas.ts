import { z } from "zod";

export const uploadFilesSchema = z.object({
  projectId: z.string().min(1),
  submissionId: z.string().min(1).optional(),
  changeRequestId: z.string().min(1).optional(),
});

export const filesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  projectId: z.string().min(1),
  submissionId: z.string().optional(),
  changeRequestId: z.string().optional(),
});

export const fileIdParam = z.object({ id: z.string().min(1) });
