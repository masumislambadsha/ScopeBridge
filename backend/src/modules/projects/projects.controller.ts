import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { okBody } from "../../core/http";
import * as S from "./projects.service";

export async function create(req: AccessRequest, res: Response) {
  S.assertCan(req.access!, "project.create");
  res.status(201).json(okBody(await S.createProject(req.access!, req.userId!, req.body)));
}

export async function list(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { status?: string; clientId?: string; search?: string; page: number; limit: number };
  const { data, meta } = await S.listProjects(req.access!, q);
  res.json(okBody(data, meta));
}

export async function get(req: AccessRequest, res: Response) {
  res.json(okBody(await S.getProject(req.access!, req.params.id)));
}

export async function patch(req: AccessRequest, res: Response) {
  S.assertCan(req.access!, "project.update");
  res.json(okBody(await S.patchProject(req.access!, req.userId!, req.params.id, req.body)));
}

export async function remove(req: AccessRequest, res: Response) {
  S.assertCan(req.access!, "project.delete");
  res.json(okBody(await S.deleteProject(req.access!, req.userId!, req.params.id)));
}

export async function listMembers(req: AccessRequest, res: Response) {
  res.json(okBody(await S.listProjectMembers(req.access!, req.params.id)));
}

export async function addMember(req: AccessRequest, res: Response) {
  S.assertCan(req.access!, "project.members");
  res.status(201).json(okBody(await S.addProjectMember(req.access!, req.userId!, req.params.id, (req.body as { userId: string }).userId)));
}

export async function removeMember(req: AccessRequest, res: Response) {
  S.assertCan(req.access!, "project.members");
  res.json(okBody(await S.removeProjectMember(req.access!, req.userId!, req.params.id, req.params.userId)));
}
