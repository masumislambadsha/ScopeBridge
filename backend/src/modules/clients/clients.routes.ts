import { Router } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate, validateAll } from "../../middleware/validate";
import { requireWorkspaceAccess, requireClientAccess } from "../../middleware/access";
import * as C from "./clients.controller";
import { createClientSchema, patchClientSchema, clientsQuerySchema, clientIdParam } from "./clients.schemas";

const r = Router();
r.use(requireAuth);

const wsRead = requireWorkspaceAccess("dashboard.view", (req) => (req.query.workspaceId ?? req.body.workspaceId) as string);
const wsWrite = (perm: "client.crud" | "client.invite") =>
  requireWorkspaceAccess(perm, (req) => (req.query.workspaceId ?? req.body.workspaceId) as string);

r.post("/clients", validate(createClientSchema), wsWrite("client.crud"), ah(C.create));
r.get("/clients", validate(clientsQuerySchema, "query"), wsRead, ah(C.list));

// Single-client routes resolve the workspace from the client itself.
const one = (perm: "client.crud" | "client.invite" | "dashboard.view") =>
  requireClientAccess(perm, (req) => req.params.id);

r.get("/clients/:id", validate(clientIdParam, "params"), one("dashboard.view"), ah(C.get));
r.patch("/clients/:id", validateAll({ params: clientIdParam, body: patchClientSchema }), one("client.crud"), ah(C.patch));
r.delete("/clients/:id", validate(clientIdParam, "params"), one("client.crud"), ah(C.remove));
r.post("/clients/:id/portal-invite", validate(clientIdParam, "params"), one("client.invite"), ah(C.portalInvite));

export default r;
