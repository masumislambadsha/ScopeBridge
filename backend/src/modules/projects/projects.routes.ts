import { Router } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate, validateAll } from "../../middleware/validate";
import { requireWorkspaceAccess, requireProjectAccess } from "../../middleware/access";
import * as C from "./projects.controller";
import {
  createProjectSchema, patchProjectSchema, projectsQuerySchema,
  projectIdParam, addProjectMemberSchema, projectMemberParam,
} from "./projects.schemas";

const r = Router();

const wsOf = (req: { query?: unknown; body?: unknown }) =>
  ((req.query as Record<string, string> | undefined)?.workspaceId ?? (req.body as Record<string, string> | undefined)?.workspaceId) as string;

// Collection routes: workspace from query/body (create/list).
r.post(
  "/projects",
  requireAuth,
  validate(createProjectSchema),
  requireWorkspaceAccess("project.create", wsOf),
  ah(C.create),
);
r.get(
  "/projects",
  requireAuth,
  validate(projectsQuerySchema, "query"),
  requireWorkspaceAccess("dashboard.view", wsOf),
  ah(C.list),
);

// Single-project routes: access from the project itself.
const one = (perm: "project.read" | "project.update" | "project.delete" | "project.members" | "dashboard.view") =>
  requireProjectAccess(perm, (req) => req.params.id, () => ({ needsProjectMembership: true }));

r.get("/projects/:id", requireAuth, validate(projectIdParam, "params"), one("project.read"), ah(C.get));
r.patch("/projects/:id", requireAuth, validateAll({ params: projectIdParam, body: patchProjectSchema }), one("project.update"), ah(C.patch));
r.delete("/projects/:id", requireAuth, validate(projectIdParam, "params"), one("project.delete"), ah(C.remove));

r.get("/projects/:id/members", requireAuth, validate(projectIdParam, "params"), one("dashboard.view"), ah(C.listMembers));
r.post(
  "/projects/:id/members",
  requireAuth,
  validateAll({ params: projectIdParam, body: addProjectMemberSchema }),
  one("project.members"),
  ah(C.addMember),
);
r.delete(
  "/projects/:id/members/:userId",
  requireAuth,
  validate(projectMemberParam, "params"),
  one("project.members"),
  ah(C.removeMember),
);

export default r;
