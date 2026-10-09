import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { forbidden, okBody } from "../../core/http";
import * as S from "./information-requests.service";

function assertAgency(req: AccessRequest, perm: "ir.crud" | "ir.send" | "requirement.clarify") {
  const a = req.access!;
  if (a.kind !== "MEMBER" || (a.role !== "ADMIN" && a.role !== "PROJECT_MANAGER")) {
    throw forbidden("Insufficient permission");
  }
  void perm;
}

export async function create(req: AccessRequest, res: Response) {
  assertAgency(req, "ir.crud");
  res.status(201).json(okBody(await S.createIR(req.access!, req.userId!, req.body)));
}

export async function list(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { projectId: string; status?: string; page: number; limit: number };
  const { data, meta } = await S.listIRs(req.access!, q.projectId, q);
  res.json(okBody(data, meta));
}

export async function get(req: AccessRequest, res: Response) {
  res.json(okBody(await S.getIR(req.access!, req.params.id)));
}

export async function patch(req: AccessRequest, res: Response) {
  assertAgency(req, "ir.crud");
  res.json(okBody(await S.patchIR(req.access!, req.userId!, req.params.id, req.body)));
}

export async function send(req: AccessRequest, res: Response) {
  assertAgency(req, "ir.send");
  res.json(okBody(await S.sendIR(req.access!, req.userId!, req.params.id)));
}

export async function clarify(req: AccessRequest, res: Response) {
  assertAgency(req, "requirement.clarify");
  res.status(201).json(okBody(await S.requestClarification(req.access!, req.userId!, req.body)));
}
