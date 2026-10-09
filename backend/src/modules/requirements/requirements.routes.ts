import { Router, Request } from "express";
import { z } from "zod";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate, validateAll } from "../../middleware/validate";
import { requireProjectAccess, requireEntityAccess } from "../../middleware/access";
import { prisma } from "../../lib/prisma";
import * as C from "./requirements.controller";
import {
  createRequirementSchema, patchRequirementSchema, requirementsQuerySchema,
  requirementIdParam, markSchema,
} from "./requirements.schemas";

const r = Router();
r.use(requireAuth);

async function requirementProject(req: Request): Promise<string | null> {
  const row = await prisma.requirement.findUnique({ where: { id: req.params.id }, select: { projectId: true } });
  return row?.projectId ?? null;
}

const NF = "Requirement not found";
const fromBody = requireProjectAccess("dashboard.view", (req) => (req.body as { projectId?: string }).projectId);
const fromQuery = requireProjectAccess("dashboard.view", (req) => (req.query as { projectId?: string }).projectId);
const one = (perm: "dashboard.view" | "requirement.crud" | "requirement.approve") =>
  requireEntityAccess(perm, requirementProject, undefined, NF);

r.post("/requirements", validate(createRequirementSchema), fromBody, ah(C.create));
r.get("/requirements", validate(requirementsQuerySchema, "query"), fromQuery, ah(C.list));
r.get("/requirements/:id", validate(requirementIdParam, "params"), one("dashboard.view"), ah(C.get));
r.patch("/requirements/:id", validateAll({ params: requirementIdParam, body: patchRequirementSchema }), one("requirement.crud"), ah(C.patch));
r.delete("/requirements/:id", validate(requirementIdParam, "params"), one("requirement.crud"), ah(C.remove));
r.post("/requirements/:id/approve", validate(requirementIdParam, "params"), one("requirement.approve"), ah(C.approve));
r.post("/requirements/mark", validate(markSchema), fromBody, ah(C.mark));
r.get(
  "/projects/:projectId/readiness",
  validate(z.object({ projectId: z.string().min(1) }), "params"),
  requireProjectAccess("dashboard.view", (req) => req.params.projectId),
  ah(C.readiness),
);

export default r;
