import { Router } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate, validateAll } from "../../middleware/validate";
import { requireWorkspaceAccess, Permission } from "../../middleware/access";
import * as C from "./workspaces.controller";
import {
  createWorkspaceSchema, patchWorkspaceSchema, workspaceListSchema,
  workspaceIdParam, addMemberSchema, patchMemberSchema, memberIdParam,
} from "./workspaces.schemas";

const r = Router();

const ws = (perm: Permission) => requireWorkspaceAccess(perm, (req) => req.params.id);

r.post("/workspaces", requireAuth, validate(createWorkspaceSchema), ah(C.create));
r.get("/workspaces", requireAuth, validate(workspaceListSchema, "query"), ah(C.list));
// Any workspace member may view the workspace (resolver 404s non-members).
r.get("/workspaces/:id", requireAuth, validate(workspaceIdParam, "params"), ws("dashboard.view"), ah(C.get));
r.patch(
  "/workspaces/:id",
  requireAuth,
  validateAll({ params: workspaceIdParam, body: patchWorkspaceSchema }),
  ws("workspace.update"),
  ah(C.patch),
);
r.delete("/workspaces/:id", requireAuth, validate(workspaceIdParam, "params"), ws("workspace.delete"), ah(C.remove));

r.post(
  "/workspaces/:id/members",
  requireAuth,
  validateAll({ params: workspaceIdParam, body: addMemberSchema }),
  ws("member.manage"),
  ah(C.addMember),
);
r.get("/workspaces/:id/members", requireAuth, validate(workspaceIdParam, "params"), ws("member.manage"), ah(C.listMembers));
r.patch(
  "/workspaces/:id/members/:memberId",
  requireAuth,
  validateAll({ params: memberIdParam, body: patchMemberSchema }),
  ws("member.manage"),
  ah(C.patchMember),
);
r.delete(
  "/workspaces/:id/members/:memberId",
  requireAuth,
  validate(memberIdParam, "params"),
  ws("member.manage"),
  ah(C.removeMember),
);

export default r;
