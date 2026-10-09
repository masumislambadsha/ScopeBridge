import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { okBody } from "../../core/http";
import * as S from "./messages.service";

export async function create(req: AccessRequest, res: Response) {
  const body = req.body as { projectId: string; content: string; visibility?: "CLIENT" | "INTERNAL" };
  res.status(201).json(okBody(await S.createMessage(req.access!, req.userId!, {
    projectId: body.projectId, content: body.content, visibility: body.visibility ?? "CLIENT",
  })));
}

export async function list(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { projectId: string; before?: string; page: number; limit: number };
  const { data, meta } = await S.listMessages(req.access!, q.projectId, q);
  res.json(okBody(data, meta));
}
