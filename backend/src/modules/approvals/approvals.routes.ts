import { Router, Request } from "express";
import { z } from "zod";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate, validateAll } from "../../middleware/validate";
import { requireEntityAccess } from "../../middleware/access";
import { prisma } from "../../lib/prisma";
import * as C from "./approvals.controller";
import {
  createApprovalSchema, decideSchema, requestChangesSchema,
  approvalsQuerySchema, approvalIdParam,
} from "./approvals.schemas";

const r = Router();
r.use(requireAuth);

async function approvalScope(req: Request): Promise<string | null> {
  const a = await prisma.approval.findUnique({ where: { id: req.params.id }, select: { scope: { select: { projectId: true } } } });
  return a?.scope.projectId ?? null;
}

// requestApproval freezes a version: PM-only, resolved from the version's project.
async function scopeProject(req: Request): Promise<string | null> {
  const s = await prisma.scope.findUnique({ where: { id: req.params.id }, select: { projectId: true } });
  return s?.projectId ?? null;
}

async function versionProject(req: Request): Promise<string | null> {
  const v = await prisma.scopeVersion.findUnique({
    where: { id: (req.body as { scopeVersionId?: string }).scopeVersionId ?? "" },
    select: { scope: { select: { projectId: true } } },
  });
  return v?.scope.projectId ?? null;
}

const NA = "Approval not found";
const one = (perm: "dashboard.view" | "approval.decide") =>
  requireEntityAccess(perm, approvalScope, undefined, NA);

// Decide routes additionally bind the approval's clientId so `can()` enforces
// "only approvals addressed to their client".
const decideCtx = async (req: Request) => {
  const a = await prisma.approval.findUnique({ where: { id: req.params.id }, select: { clientId: true } });
  return { approvalClientId: a?.clientId };
};
const oneDecide = requireEntityAccess("approval.decide", approvalScope, decideCtx, NA);

r.post(
  "/approvals",
  validate(createApprovalSchema),
  requireEntityAccess("scope.send", versionProject, undefined, "Scope version not found"),
  ah(C.create),
);
r.get("/approvals", validate(approvalsQuerySchema, "query"), ah(C.list));
r.get("/approvals/:id", validate(approvalIdParam, "params"), one("dashboard.view"), ah(C.get));
r.post("/approvals/:id/approve", validateAll({ params: approvalIdParam, body: decideSchema }), oneDecide, ah(C.approve));
r.post("/approvals/:id/reject", validateAll({ params: approvalIdParam, body: decideSchema }), oneDecide, ah(C.reject));
r.post("/approvals/:id/request-changes", validateAll({ params: approvalIdParam, body: requestChangesSchema }), oneDecide, ah(C.requestChanges));

// Required §7.1 path: sends the scope's open DRAFT (or body.scopeVersionId) for approval.
r.post(
  "/scopes/:id/request-approval",
  validateAll({ params: z.object({ id: z.string().min(1) }), body: z.object({ scopeVersionId: z.string().min(1).optional() }) }),
  requireEntityAccess("scope.send", scopeProject, undefined, "Scope not found"),
  ah(C.requestApprovalForScope),
);

export default r;
