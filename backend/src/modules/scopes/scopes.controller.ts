import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { forbidden, okBody } from "../../core/http";
import * as S from "./scopes.service";

function assertPM(req: AccessRequest) {
  const a = req.access!;
  if (a.kind !== "MEMBER" || (a.role !== "ADMIN" && a.role !== "PROJECT_MANAGER")) throw forbidden("Insufficient permission");
}

export async function create(req: AccessRequest, res: Response) {
  assertPM(req);
  const body = req.body as { projectId: string; title?: string };
  res.status(201).json(okBody(await S.createScope(req.access!, req.userId!, body.projectId, body.title)));
}

export async function list(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { projectId: string; page: number; limit: number };
  const { data, meta } = await S.listScopes(req.access!, q.projectId, q);
  res.json(okBody(data, meta));
}

export async function get(req: AccessRequest, res: Response) {
  res.json(okBody(await S.getScope(req.access!, req.params.id)));
}

export async function getVersion(req: AccessRequest, res: Response) {
  res.json(okBody(await S.getVersion(req.access!, req.params.id)));
}

export async function patchVersion(req: AccessRequest, res: Response) {
  assertPM(req);
  res.json(okBody(await S.patchVersion(req.access!, req.userId!, req.params.id, req.body)));
}

export async function createVersion(req: AccessRequest, res: Response) {
  assertPM(req);
  const body = req.body as { basedOnVersionId?: string };
  res.status(201).json(okBody(await S.createVersion(req.access!, req.userId!, req.params.id, body.basedOnVersionId)));
}

export async function listVersions(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { page: number; limit: number };
  const { data, meta } = await S.listVersions(req.access!, req.params.id, q);
  res.json(okBody(data, meta));
}

export async function compare(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { from: string; to: string };
  res.json(okBody(await S.compareVersions(req.access!, req.params.id, q.from, q.to)));
}
