import { Router, Request } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { requireProjectAccess, requireEntityAccess } from "../../middleware/access";
import { prisma } from "../../lib/prisma";
import { uploadMany } from "../../middleware/upload";
import * as C from "./files.controller";
import { uploadFilesSchema, filesQuerySchema, fileIdParam } from "./files.schemas";

const r = Router();

async function fileProject(req: Request): Promise<string | null> {
  const f = await prisma.file.findUnique({ where: { id: req.params.id }, select: { projectId: true } });
  return f?.projectId ?? null;
}

r.post(
  "/files",
  requireAuth,
  uploadMany,
  validate(uploadFilesSchema),
  requireProjectAccess("submission.create", (req) => (req.body as { projectId?: string }).projectId),
  ah(C.upload),
);
r.get(
  "/files",
  requireAuth,
  validate(filesQuerySchema, "query"),
  requireProjectAccess("dashboard.view", (req) => (req.query as { projectId?: string }).projectId),
  ah(C.list),
);
r.get(
  "/files/:id/download",
  requireAuth,
  validate(fileIdParam, "params"),
  requireEntityAccess("dashboard.view", fileProject, undefined, "File not found"),
  ah(C.download),
);

export default r;
