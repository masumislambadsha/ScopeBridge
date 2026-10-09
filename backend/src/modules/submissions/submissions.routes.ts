import { Router, Request } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { requireProjectAccess, requireEntityAccess } from "../../middleware/access";
import { prisma } from "../../lib/prisma";
import { uploadMany } from "../../middleware/upload";
import * as C from "./submissions.controller";
import { submissionsQuerySchema, submissionIdParam } from "./submissions.schemas";

const r = Router();
r.use(requireAuth);

async function submissionProject(req: Request): Promise<string | null> {
  const s = await prisma.submission.findUnique({ where: { id: req.params.id }, select: { projectId: true } });
  return s?.projectId ?? null;
}

// Multipart goes DIRECTLY to the API (no Next.js proxy — body size limits, §3.3).
r.post(
  "/submissions",
  uploadMany,
  requireProjectAccess("submission.create", (req) => (req.body as { projectId?: string }).projectId),
  ah(C.create),
);
r.get(
  "/submissions",
  validate(submissionsQuerySchema, "query"),
  requireProjectAccess("dashboard.view", (req) => (req.query as { projectId?: string }).projectId),
  ah(C.list),
);
r.get(
  "/submissions/:id",
  validate(submissionIdParam, "params"),
  requireEntityAccess("dashboard.view", submissionProject, undefined, "Submission not found"),
  ah(C.get),
);

export default r;
