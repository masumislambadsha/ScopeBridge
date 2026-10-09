import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { forbidden, okBody } from "../../core/http";
import * as S from "./approvals.service";

function assertPM(req: AccessRequest) {
  const a = req.access!;
  if (a.kind !== "MEMBER" || (a.role !== "ADMIN" && a.role !== "PROJECT_MANAGER")) throw forbidden("Insufficient permission");
}

function decisionOf(req: AccessRequest) {
  const body = req.body as { comment?: string; signatureName: string };
  return {
    comment: body.comment, signatureName: body.signatureName,
    ip: (req.ip ?? req.socket?.remoteAddress) as string | undefined,
    userAgent: req.headers["user-agent"],
  };
}

export async function create(req: AccessRequest, res: Response) {
  assertPM(req);
  const body = req.body as { scopeVersionId: string };
  res.status(201).json(okBody(await S.requestApproval(req.access!, req.userId!, body.scopeVersionId)));
}

/** §7.1 path: POST /api/scopes/:id/request-approval. */
export async function requestApprovalForScope(req: AccessRequest, res: Response) {
  assertPM(req);
  const body = req.body as { scopeVersionId?: string };
  res.status(201).json(okBody(await S.requestApprovalForScope(req.access!, req.userId!, req.params.id, body.scopeVersionId)));
}

export async function list(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { scopeId?: string; scopeVersionId?: string; status?: string; page: number; limit: number };
  const { data, meta } = await S.listApprovals(req.userId!, q);
  res.json(okBody(data, meta));
}

export async function get(req: AccessRequest, res: Response) {
  res.json(okBody(await S.getApproval(req.access!, req.params.id)));
}

export async function approve(req: AccessRequest, res: Response) {
  res.json(okBody(await S.approve(req.access!, req.userId!, req.params.id, decisionOf(req))));
}

export async function reject(req: AccessRequest, res: Response) {
  res.json(okBody(await S.reject(req.access!, req.userId!, req.params.id, decisionOf(req))));
}

export async function requestChanges(req: AccessRequest, res: Response) {
  res.json(okBody(await S.requestChanges(req.access!, req.userId!, req.params.id, decisionOf(req))));
}
