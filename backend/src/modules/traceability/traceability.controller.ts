import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { okBody } from "../../core/http";
import * as S from "./traceability.service";

export async function get(req: AccessRequest, res: Response) {
  res.json(okBody(await S.traceability(req.access!, req.params.id)));
}
