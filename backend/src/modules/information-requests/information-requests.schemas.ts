import { z } from "zod";

const questionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  answerType: z.enum(["text", "longtext", "select", "file"]).default("text"),
  options: z.array(z.string()).default([]),
  required: z.boolean().default(false),
});

export const createIRSchema = z.object({
  projectId: z.string().min(1),
  type: z.enum(["INITIAL", "CLARIFICATION"]).default("INITIAL"),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  questions: z.array(questionSchema).min(1),
  deadline: z.string().datetime().optional(),
});

export const patchIRSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  questions: z.array(questionSchema).min(1).optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: z.enum(["DRAFT", "CLOSED"]).optional(),
});

export const irQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  projectId: z.string().min(1),
  status: z.enum(["DRAFT", "SENT", "ANSWERED", "CLOSED"]).optional(),
});

export const irIdParam = z.object({ id: z.string().min(1) });

export const clarifySchema = z.object({
  projectId: z.string().min(1),
  requirementIds: z.array(z.string().min(1)).min(1).max(50),
  questions: z.array(questionSchema).min(1),
  deadline: z.string().datetime().optional(),
});
