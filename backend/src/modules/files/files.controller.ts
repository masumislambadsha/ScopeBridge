import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { okBody } from "../../core/http";
import * as S from "./files.service";

export async function upload(req: AccessRequest, res: Response) {
  const body = req.body as { projectId: string; submissionId?: string; changeRequestId?: string };
  const files = ((req as unknown as { files?: Express.Multer.File[] }).files ?? []).map((f) => ({
    buffer: f.buffer, originalname: f.originalname, mimetype: f.mimetype, size: f.size,
  }));
  const rows = await S.uploadFiles(req.access!, req.userId!, {
    projectId: body.projectId,
    submissionId: body.submissionId || undefined,
    changeRequestId: body.changeRequestId || undefined,
  }, files);
  res.status(201).json(okBody(rows));
}

export async function list(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { projectId: string; submissionId?: string; changeRequestId?: string; page: number; limit: number };
  const { data, meta } = await S.listFiles(req.access!, q.projectId, q);
  res.json(okBody(data, meta));
}

export async function download(req: AccessRequest, res: Response) {
  const out = await S.downloadFile(req.access!, req.params.id);
  if (out.kind === "redirect") {
    res.redirect(out.url);
    return;
  }
  res.setHeader("Content-Type", out.mime);
  res.setHeader("Content-Disposition", `attachment; filename="${out.name.replace(/"/g, "")}"`);
  const { createReadStream } = await import("fs");
  createReadStream(out.path).pipe(res);
}
