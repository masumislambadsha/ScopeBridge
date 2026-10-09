import { Router } from "express";
import { Request } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate, validateAll } from "../../middleware/validate";
import { requireProjectAccess, requireEntityAccess } from "../../middleware/access";
import { prisma } from "../../lib/prisma";
import * as C from "./information-requests.controller";
import { createIRSchema, patchIRSchema, irQuerySchema, irIdParam, clarifySchema } from "./information-requests.schemas";

const r = Router();
r.use(requireAuth);

async function irProject(req: Request): Promise<string | null> {
  const ir = await prisma.informationRequest.findUnique({ where: { id: req.params.id }, select: { projectId: true } });
  return ir?.projectId ?? null;
}

const fromBody = requireProjectAccess("ir.crud", (req) => (req.body as { projectId?: string }).projectId);
const fromQuery = requireProjectAccess("dashboard.view", (req) => (req.query as { projectId?: string }).projectId);
const one = (perm: "dashboard.view" | "ir.crud" | "ir.send") =>
  requireEntityAccess(perm, irProject, undefined, "Information request not found");

r.post("/information-requests", validate(createIRSchema), fromBody, ah(C.create));
r.get("/information-requests", validate(irQuerySchema, "query"), fromQuery, ah(C.list));
r.get("/information-requests/:id", validate(irIdParam, "params"), one("dashboard.view"), ah(C.get));
r.patch("/information-requests/:id", validateAll({ params: irIdParam, body: patchIRSchema }), one("ir.crud"), ah(C.patch));
r.post("/information-requests/:id/send", validate(irIdParam, "params"), one("ir.send"), ah(C.send));
r.post("/requirements/request-clarification", validate(clarifySchema), fromBody, ah(C.clarify));

export default r;
