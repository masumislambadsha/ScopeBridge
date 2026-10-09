import { z } from "zod";
import { paginationSchema } from "../auth/auth.schemas";

export const createClientSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  company: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
  contactName: z.string().max(120).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const patchClientSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().max(255).optional(),
  company: z.string().max(160).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  contactName: z.string().max(120).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export const clientsQuerySchema = paginationSchema.extend({
  workspaceId: z.string().min(1),
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export const clientIdParam = z.object({ id: z.string().min(1) });
