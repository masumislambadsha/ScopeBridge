import { z } from "zod";

export const createSubmissionSchema = z.object({
  projectId: z.string().min(1),
  informationRequestId: z.string().min(1).optional(),
  answers: z.record(z.string(), z.string()).default({}),
  additionalInfo: z.string().max(4000).optional(),
});

export const submissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  projectId: z.string().min(1),
  informationRequestId: z.string().optional(),
});

export const submissionIdParam = z.object({ id: z.string().min(1) });
