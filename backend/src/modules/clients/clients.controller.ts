import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { okBody } from "../../core/http";
import * as S from "./clients.service";

export async function create(req: AccessRequest, res: Response) {
  res.status(201).json(okBody(await S.createClient(req.access!, req.userId!, req.body)));
}

export async function list(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { search?: string; status?: "ACTIVE" | "INACTIVE" | "ARCHIVED"; page: number; limit: number };
  const { data, meta } = await S.listClients(req.access!, q);
  res.json(okBody(data, meta));
}

export async function get(req: AccessRequest, res: Response) {
  res.json(okBody(await S.getClient(req.access!, req.params.id)));
}

export async function patch(req: AccessRequest, res: Response) {
  res.json(okBody(await S.patchClient(req.access!, req.userId!, req.params.id, req.body)));
}

export async function remove(req: AccessRequest, res: Response) {
  res.json(okBody(await S.deleteClient(req.access!, req.userId!, req.params.id)));
}

export async function portalInvite(req: AccessRequest, res: Response) {
  res.status(201).json(okBody(await S.inviteToPortal(req.access!, req.userId!, req.params.id)));
}
