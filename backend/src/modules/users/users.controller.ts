import { Response } from "express";
import { AuthedRequest } from "../../middleware/auth";
import { okBody } from "../../core/http";
import * as S from "./users.service";

export async function list(req: AuthedRequest, res: Response) {
  const q = req.query as unknown as { workspaceId: string; search?: string; page: number; limit: number };
  const { data, meta } = await S.listUsers(req.userId!, q);
  res.json(okBody(data, meta));
}

export async function get(req: AuthedRequest, res: Response) {
  res.json(okBody(await S.getUser(req.userId!, req.params.id)));
}

export async function patch(req: AuthedRequest, res: Response) {
  res.json(okBody(await S.patchUser(req.userId!, req.params.id, req.body)));
}
