import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { forbidden, okBody } from "../../core/http";
import * as S from "./requirements.service";

function assertPM(req: AccessRequest) {
  const a = req.access!;
  if (a.kind !== "MEMBER" || (a.role !== "ADMIN" && a.role !== "PROJECT_MANAGER")) throw forbidden("Insufficient permission");
}

export async function create(req: AccessRequest, res: Response) {
  assertPM(req);
  res.status(201).json(okBody(await S.createRequirement(req.access!, req.userId!, req.body)));
}

export async function list(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { projectId: string; status?: string; source?: string; search?: string; page: number; limit: number };
  const { data, meta } = await S.listRequirements(req.access!, q.projectId, q);
  res.json(okBody(data, meta));
}

export async function get(req: AccessRequest, res: Response) {
  res.json(okBody(await S.getRequirement(req.access!, req.params.id)));
}

export async function patch(req: AccessRequest, res: Response) {
  assertPM(req);
  res.json(okBody(await S.patchRequirement(req.access!, req.userId!, req.params.id, req.body)));
}

export async function approve(req: AccessRequest, res: Response) {
  assertPM(req);
  res.json(okBody(await S.approveRequirement(req.access!, req.userId!, req.params.id)));
}

export async function remove(req: AccessRequest, res: Response) {
  assertPM(req);
  res.json(okBody(await S.deleteRequirement(req.access!, req.userId!, req.params.id)));
}

export async function mark(req: AccessRequest, res: Response) {
  assertPM(req);
  const body = req.body as { projectId: string; requirementIds: string[]; verdict: "READY" | "NEEDS_CLARIFICATION" };
  res.json(okBody(await S.markRequirements(req.access!, req.userId!, body.projectId, body.requirementIds, body.verdict)));
}

export async function readiness(req: AccessRequest, res: Response) {
  res.json(okBody(await S.latestReadiness(req.access!, req.params.projectId)));
}
