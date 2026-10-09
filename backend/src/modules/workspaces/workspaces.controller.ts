import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { okBody } from "../../core/http";
import * as S from "./workspaces.service";

export async function create(req: AccessRequest, res: Response) {
  res.status(201).json(okBody(await S.createWorkspace(req.userId!, req.body)));
}

export async function list(req: AccessRequest, res: Response) {
  const { data, meta } = await S.listWorkspaces(req.userId!, req.query as unknown as { page: number; limit: number });
  res.json(okBody(data, meta));
}

export async function get(req: AccessRequest, res: Response) {
  const ws = await S.getWorkspace(req.access!.workspaceId);
  res.json(okBody({ ...ws, role: req.access!.kind === "MEMBER" ? req.access!.role : undefined }));
}

export async function patch(req: AccessRequest, res: Response) {
  res.json(okBody(await S.patchWorkspace(req.access!.workspaceId, req.userId!, req.body)));
}

export async function remove(req: AccessRequest, res: Response) {
  res.json(okBody(await S.deleteWorkspace(req.access!.workspaceId)));
}

export async function listMembers(req: AccessRequest, res: Response) {
  res.json(okBody(await S.listMembers(req.access!.workspaceId)));
}

export async function addMember(req: AccessRequest, res: Response) {
  const { email, role } = req.body as { email: string; role: "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER" };
  res.status(201).json(okBody(await S.addMemberByEmail(req.userId!, req.access!.workspaceId, email, role)));
}

export async function patchMember(req: AccessRequest, res: Response) {
  const { role } = req.body as { role: "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER" };
  res.json(okBody(await S.patchMember(req.userId!, req.access!.workspaceId, req.params.memberId, role)));
}

export async function removeMember(req: AccessRequest, res: Response) {
  res.json(okBody(await S.removeMember(req.userId!, req.access!.workspaceId, req.params.memberId)));
}
