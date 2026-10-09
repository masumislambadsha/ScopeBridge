import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { forbidden, okBody } from "../../core/http";
import * as S from "./change-requests.service";

function assertPM(req: AccessRequest) {
  const a = req.access!;
  if (a.kind !== "MEMBER" || (a.role !== "ADMIN" && a.role !== "PROJECT_MANAGER")) throw forbidden("Insufficient permission");
}

export async function create(req: AccessRequest, res: Response) {
  const body = req.body as { projectId: string; title: string; description: string };
  const files = ((req as unknown as { files?: Express.Multer.File[] }).files ?? []).map((f) => ({
    buffer: f.buffer, originalname: f.originalname, mimetype: f.mimetype, size: f.size,
  }));
  res.status(201).json(okBody(await S.createCR(req.access!, req.userId!, body, files)));
}

export async function list(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { projectId: string; status?: string; page: number; limit: number };
  const { data, meta } = await S.listCRs(req.access!, q.projectId, q);
  res.json(okBody(data, meta));
}

export async function get(req: AccessRequest, res: Response) {
  res.json(okBody(await S.getCR(req.access!, req.params.id)));
}

export async function patch(req: AccessRequest, res: Response) {
  assertPM(req);
  res.json(okBody(await S.patchCR(req.access!, req.userId!, req.params.id, req.body)));
}

export async function analyze(req: AccessRequest, res: Response) {
  assertPM(req);
  const out = await S.analyzeCR(req.access!, req.userId!, req.params.id);
  res.status(202).json(okBody(out));
}

export async function approve(req: AccessRequest, res: Response) {
  assertPM(req);
  res.json(okBody(await S.approveCR(req.access!, req.userId!, req.params.id, req.body)));
}

export async function reject(req: AccessRequest, res: Response) {
  assertPM(req);
  const body = req.body as { reason: string };
  res.json(okBody(await S.rejectCR(req.access!, req.userId!, req.params.id, body.reason)));
}

export async function implement(req: AccessRequest, res: Response) {
  assertPM(req);
  res.json(okBody(await S.markImplemented(req.access!, req.userId!, req.params.id)));
}
