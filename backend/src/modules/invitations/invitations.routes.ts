import { Router } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { requireWorkspaceAccess } from "../../middleware/access";
import * as C from "./invitations.controller";
import { createInvitationSchema, tokenParamSchema, idParamSchema } from "./invitations.schemas";

const r = Router();

// Workspace-scoped management (ADMIN only via member.manage).
r.post(
  "/workspaces/:id/invitations",
  requireAuth,
  requireWorkspaceAccess("member.manage", (req) => req.params.id),
  validate(createInvitationSchema),
  ah(C.create),
);
r.get(
  "/workspaces/:id/invitations",
  requireAuth,
  requireWorkspaceAccess("member.manage", (req) => req.params.id),
  ah(C.list),
);
r.delete(
  "/workspaces/:id/invitations/:invId",
  requireAuth,
  requireWorkspaceAccess("member.manage", (req) => req.params.id),
  ah(C.revoke),
);

// Public preview + authenticated accept.
r.get("/invitations/:token", validate(tokenParamSchema, "params"), ah(C.preview));
r.post("/invitations/:token/accept", requireAuth, validate(tokenParamSchema, "params"), ah(C.accept));
r.delete(
  "/invitations/:id",
  requireAuth,
  validate(idParamSchema, "params"),
  ah(C.attachInvitationWorkspace),
  requireWorkspaceAccess("member.manage", (req) => (req as unknown as Record<string, string>).invWorkspaceId),
  ah(C.revoke),
);

export default r;
