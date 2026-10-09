import { Router, Request } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate, validateAll } from "../../middleware/validate";
import { requireProjectAccess, requireEntityAccess, attachMembership } from "../../middleware/access";
import { prisma } from "../../lib/prisma";
import * as C from "./tasks.controller";
import {
  createTaskSchema, patchTaskSchema, tasksQuerySchema,
  taskIdParam, generateTasksSchema, bulkTasksSchema,
} from "./tasks.schemas";
import { paginationSchema } from "../auth/auth.schemas";

const r = Router();
r.use(requireAuth);

async function taskProject(req: Request): Promise<string | null> {
  const t = await prisma.task.findUnique({ where: { id: req.params.id }, select: { projectId: true } });
  return t?.projectId ?? null;
}

async function versionProject(req: Request): Promise<string | null> {
  const v = await prisma.scopeVersion.findUnique({ where: { id: req.params.id }, select: { scope: { select: { projectId: true } } } });
  return v?.scope.projectId ?? null;
}

const NT = "Task not found";
const fromBody = requireProjectAccess("dashboard.view", (req) => (req.body as { projectId?: string }).projectId);
const one = requireEntityAccess("dashboard.view", taskProject, undefined, NT);

r.post("/tasks", validate(createTaskSchema), fromBody, ah(C.create));
r.get("/tasks", validate(tasksQuerySchema, "query"), attachMembership, ah(C.list));
r.get("/tasks/mine", validate(paginationSchema, "query"), attachMembership, ah(C.mine));
r.get("/tasks/:id", validate(taskIdParam, "params"), one, ah(C.get));
r.patch("/tasks/:id", validateAll({ params: taskIdParam, body: patchTaskSchema }), one, ah(C.patch));
r.delete("/tasks/:id", validate(taskIdParam, "params"), one, ah(C.remove));

r.get(
  "/scope-versions/:id/generate-tasks",
  validateAll({ params: taskIdParam, query: generateTasksSchema }),
  requireEntityAccess("dashboard.view", versionProject, undefined, "Scope version not found"),
  ah(C.generate),
);
r.post(
  "/projects/:projectId/tasks/bulk",
  validate(bulkTasksSchema),
  requireProjectAccess("dashboard.view", (req) => req.params.projectId),
  ah(C.bulk),
);

export default r;
