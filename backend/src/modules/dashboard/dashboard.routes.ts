import { Router } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { requireWorkspaceAccess } from "../../middleware/access";
import * as C from "./dashboard.controller";
import { analyticsQuerySchema } from "./dashboard.schemas";

const r = Router();
r.use(requireAuth);

r.get(
  "/dashboard/analytics",
  validate(analyticsQuerySchema, "query"),
  requireWorkspaceAccess("dashboard.view", (req) => (req.query as { workspaceId?: string }).workspaceId),
  ah(C.get),
);

export default r;
