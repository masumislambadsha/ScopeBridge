import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { okBody } from "../../core/http";
import * as S from "./dashboard.service";

export async function get(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { workspaceId: string };
  res.json(okBody(await S.analytics(req.access!, q.workspaceId)));
}
