import { Response } from "express";
import { AccessRequest } from "../../middleware/access";
import { forbidden, okBody } from "../../core/http";
import * as S from "./tasks.service";

function assertPM(req: AccessRequest, what: "create" | "delete" = "create") {
  const a = req.access!;
  if (a.kind !== "MEMBER" || (a.role !== "ADMIN" && a.role !== "PROJECT_MANAGER")) {
    throw forbidden(what === "delete" ? "Only admins and PMs can delete tasks" : "Only admins and PMs can create tasks");
  }
}

export async function create(req: AccessRequest, res: Response) {
  assertPM(req);
  res.status(201).json(okBody(await S.createTask(req.access!, req.userId!, req.body)));
}

export async function list(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { projectId?: string; status?: string; assigneeId?: string; priority?: string; page: number; limit: number };
  const { data, meta } = await S.listTasks(req.access!, q);
  res.json(okBody(data, meta));
}

export async function mine(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { page: number; limit: number };
  const { data, meta } = await S.myTasks(req.access!, q);
  res.json(okBody(data, meta));
}

export async function get(req: AccessRequest, res: Response) {
  res.json(okBody(await S.getTask(req.access!, req.params.id)));
}

export async function patch(req: AccessRequest, res: Response) {
  res.json(okBody(await S.patchTask(req.access!, req.userId!, req.params.id, req.body)));
}

export async function remove(req: AccessRequest, res: Response) {
  assertPM(req, "delete");
  res.json(okBody(await S.deleteTask(req.access!, req.userId!, req.params.id)));
}

export async function generate(req: AccessRequest, res: Response) {
  assertPM(req);
  const q = req.query as unknown as { onlyNew?: boolean };
  res.json(okBody(await S.generateTasksPreview(req.access!, req.params.id, q.onlyNew === true)));
}

export async function bulk(req: AccessRequest, res: Response) {
  assertPM(req);
  res.status(201).json(okBody(await S.bulkCreateTasks(req.access!, req.userId!, req.params.projectId, req.body)));
}
