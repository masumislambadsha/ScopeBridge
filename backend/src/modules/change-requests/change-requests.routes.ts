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
r.use(requireAuth);

async function crProject(req: Request): Promise<string | null> {
  const c = await prisma.changeRequest.findUnique({ where: { id: req.params.id }, select: { projectId: true } });
  return c?.projectId ?? null;
}

const NE = "Change request not found";
const one = requireEntityAccess("dashboard.view", crProject, undefined, NE);

r.post(
  "/change-requests",
  uploadMany,
  validate(createCRSchema),
  requireProjectAccess("cr.create", (req) => (req.body as { projectId?: string }).projectId),
  ah(C.create),
);
r.get(
  "/change-requests",
  validate(crsQuerySchema, "query"),
  requireProjectAccess("dashboard.view", (req) => (req.query as { projectId?: string }).projectId),
  ah(C.list),
);
r.get("/change-requests/:id", validate(crIdParam, "params"), one, ah(C.get));
r.patch("/change-requests/:id", validateAll({ params: crIdParam, body: patchCRSchema }), one, ah(C.patch));
r.post("/change-requests/:id/analyze", validate(crIdParam, "params"), one, ah(C.analyze));
r.post("/change-requests/:id/approve", validateAll({ params: crIdParam, body: approveCRSchema }), one, ah(C.approve));
r.post("/change-requests/:id/reject", validateAll({ params: crIdParam, body: rejectCRSchema }), one, ah(C.reject));
r.post("/change-requests/:id/implement", validate(crIdParam, "params"), one, ah(C.implement));

export default r;
