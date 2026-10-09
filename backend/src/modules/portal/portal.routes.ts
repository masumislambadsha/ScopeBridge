import { Router } from "express";
import { z } from "zod";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { requireProjectAccess } from "../../middleware/access";
import * as C from "./portal.controller";

const r = Router();
r.use(requireAuth);

r.get("/portal/projects", ah(C.projects));
r.get(
  "/portal/projects/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  requireProjectAccess("project.read", (req) => req.params.id),
  ah(C.project),
);

export default r;
