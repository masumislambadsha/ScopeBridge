import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { okBody } from "../../core/http";
import * as S from "./portal.service";

export async function projects(req: AccessRequest, res: Response) {
  const access = await S.resolvePortalAccess(req.userId!);
  S.assertPortal(access);
  res.json(okBody(await S.portalProjects(req.userId!)));
}

export async function project(req: AccessRequest, res: Response) {
  const access = await S.resolvePortalAccess(req.userId!);
  S.assertPortal(access);
  res.json(okBody(await S.portalProject(req.userId!, req.params.id)));
}
