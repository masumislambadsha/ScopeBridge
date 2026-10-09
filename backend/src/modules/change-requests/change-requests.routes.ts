import { Router, Request } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate, validateAll } from "../../middleware/validate";
import { requireProjectAccess, requireEntityAccess } from "../../middleware/access";
import { prisma } from "../../lib/prisma";
import { uploadMany } from "../../middleware/upload";
import * as C from "./change-requests.controller";
import {
  createCRSchema, patchCRSchema, crsQuerySchema, crIdParam,
  approveCRSchema, rejectCRSchema,
} from "./change-requests.schemas";

const r = Router();

async function crProject(req: Request): Promise<string | null> {
  const c = await prisma.changeRequest.findUnique({ where: { id: req.params.id }, select: { projectId: true } });
  return c?.projectId ?? null;
}

const NE = "Change request not found";
const one = requireEntityAccess("dashboard.view", crProject, undefined, NE);

r.post(
  "/change-requests",
  requireAuth,
  uploadMany,
  validate(createCRSchema),
  requireProjectAccess("cr.create", (req) => (req.body as { projectId?: string }).projectId),
  ah(C.create),
);
r.get(
  "/change-requests",
  requireAuth,
  validate(crsQuerySchema, "query"),
  requireProjectAccess("dashboard.view", (req) => (req.query as { projectId?: string }).projectId),
  ah(C.list),
);
r.get("/change-requests/:id", requireAuth, validate(crIdParam, "params"), one, ah(C.get));
r.patch("/change-requests/:id", requireAuth, validateAll({ params: crIdParam, body: patchCRSchema }), one, ah(C.patch));
r.post("/change-requests/:id/analyze", requireAuth, validate(crIdParam, "params"), one, ah(C.analyze));
r.post("/change-requests/:id/approve", requireAuth, validateAll({ params: crIdParam, body: approveCRSchema }), one, ah(C.approve));
r.post("/change-requests/:id/reject", requireAuth, validateAll({ params: crIdParam, body: rejectCRSchema }), one, ah(C.reject));
r.post("/change-requests/:id/implement", requireAuth, validate(crIdParam, "params"), one, ah(C.implement));

export default r;
