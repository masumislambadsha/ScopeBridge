import { Router, Request } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate, validateAll } from "../../middleware/validate";
import { requireProjectAccess, requireEntityAccess } from "../../middleware/access";
import { prisma } from "../../lib/prisma";
import * as C from "./scopes.controller";
import {
  createScopeSchema, patchVersionSchema, scopesQuerySchema,
  scopeIdParam, createVersionSchema, compareQuerySchema,
} from "./scopes.schemas";

const r = Router();

async function scopeProject(req: Request): Promise<string | null> {
  const s = await prisma.scope.findUnique({ where: { id: req.params.id }, select: { projectId: true } });
  return s?.projectId ?? null;
}

async function versionProject(req: Request): Promise<string | null> {
  const v = await prisma.scopeVersion.findUnique({ where: { id: req.params.id }, select: { scope: { select: { projectId: true } } } });
  return v?.scope.projectId ?? null;
}

const NF = "Scope not found";
const fromBody = requireProjectAccess("dashboard.view", (req) => (req.body as { projectId?: string }).projectId);
const fromQuery = requireProjectAccess("dashboard.view", (req) => (req.query as { projectId?: string }).projectId);
const one = requireEntityAccess("dashboard.view", scopeProject, undefined, NF);
const oneVersion = requireEntityAccess("dashboard.view", versionProject, undefined, "Scope version not found");

r.post("/scopes", requireAuth, validate(createScopeSchema), fromBody, ah(C.create));
r.get("/scopes", requireAuth, validate(scopesQuerySchema, "query"), fromQuery, ah(C.list));
r.get("/scopes/:id", requireAuth, validate(scopeIdParam, "params"), one, ah(C.get));
r.post("/scopes/:id/versions", requireAuth, validateAll({ params: scopeIdParam, body: createVersionSchema }), one, ah(C.createVersion));
r.get("/scopes/:id/versions", requireAuth, validate(scopeIdParam, "params"), one, ah(C.listVersions));
r.get("/scopes/:id/compare", requireAuth, validateAll({ params: scopeIdParam, query: compareQuerySchema }), one, ah(C.compare));
r.get("/scope-versions/:id", requireAuth, validate(scopeIdParam, "params"), oneVersion, ah(C.getVersion));
r.patch("/scope-versions/:id", requireAuth, validateAll({ params: scopeIdParam, body: patchVersionSchema }), oneVersion, ah(C.patchVersion));

export default r;
