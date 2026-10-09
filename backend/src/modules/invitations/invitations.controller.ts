import { Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";
import { AccessRequest } from "../../middleware/access";
import { amw, notFound, okBody } from "../../core/http";
import * as S from "./invitations.service";

export async function create(req: AccessRequest, res: Response) {
  const out = await S.createInvitation(req.userId!, req.access!.workspaceId, req.body);
  res.status(201).json(okBody(out));
}

export async function preview(req: AccessRequest, res: Response) {
  res.json(okBody(await S.previewInvitation(req.params.token)));
}

export async function accept(req: AccessRequest, res: Response) {
  const me = await import("../../modules/auth/auth.service").then((m) => m.me(req.userId!));
  const out = await S.acceptInvitationForUser(req.userId!, me.user.email, req.params.token);
  res.json(okBody(out));
}

export async function list(req: AccessRequest, res: Response) {
  res.json(okBody(await S.listInvitations(req.access!.workspaceId)));
}

export async function revoke(req: AccessRequest, res: Response) {
  const p = req.params as { id?: string; invId?: string };
  res.json(okBody(await S.revokeInvitation(req.access!.workspaceId, req.userId!, p.invId ?? p.id!)));
}

/** Resolve the workspace of DELETE /api/invitations/:id for the access check. */
export const attachInvitationWorkspace = amw(async (req: AccessRequest, _res: Response, next: NextFunction) => {
  const inv = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!inv) throw notFound("Invitation not found");
  (req as unknown as Record<string, unknown>).invWorkspaceId = inv.workspaceId;
  next();
});
