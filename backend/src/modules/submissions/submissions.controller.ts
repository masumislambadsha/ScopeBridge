import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { forbidden, okBody } from "../../core/http";
import * as S from "./submissions.service";

export async function create(req: AccessRequest, res: Response) {
  const a = req.access!;
  const body = req.body as { projectId?: string; informationRequestId?: string; answers?: unknown; additionalInfo?: string };
  if (!body.projectId) throw forbidden("projectId is required");
  const files = ((req as unknown as { files?: Express.Multer.File[] }).files ?? []).map((f) => ({
    buffer: f.buffer, originalname: f.originalname, mimetype: f.mimetype, size: f.size,
  }));
  const out = await S.createSubmission(
    a, req.userId!,
    {
      projectId: body.projectId,
      informationRequestId: body.informationRequestId || undefined,
      answers: S.parseAnswers(body.answers),
      additionalInfo: body.additionalInfo,
    },
    files,
  );
  res.status(201).json(okBody(out));
}

export async function list(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { projectId: string; informationRequestId?: string; page: number; limit: number };
  const { data, meta } = await S.listSubmissions(req.access!, q.projectId, q);
  res.json(okBody(data, meta));
}

export async function get(req: AccessRequest, res: Response) {
  res.json(okBody(await S.getSubmission(req.access!, req.params.id)));
}
