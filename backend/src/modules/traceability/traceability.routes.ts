import { Router } from "express";
import { z } from "zod";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { requireProjectAccess } from "../../middleware/access";
import * as C from "./traceability.controller";

const r = Router();

r.get(
  "/projects/:id/traceability",
  requireAuth,
  validate(z.object({ id: z.string().min(1) }), "params"),
  requireProjectAccess("dashboard.view", (req) => req.params.id),
  ah(C.get),
);

export default r;
