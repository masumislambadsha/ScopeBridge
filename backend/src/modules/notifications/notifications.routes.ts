import { Router } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import * as C from "./notifications.controller";
import { notificationsQuerySchema, notificationIdParam, activityQuerySchema } from "./notifications.schemas";

const r = Router();

r.get("/notifications", requireAuth, validate(notificationsQuerySchema, "query"), ah(C.list));
r.patch("/notifications/read-all", requireAuth, ah(C.markAllRead));
r.patch("/notifications/:id/read", requireAuth, validate(notificationIdParam, "params"), ah(C.markRead));
r.get(
  "/activity",
  requireAuth,
  validate(activityQuerySchema, "query"),
  ah(C.resolveActivityAccess),
  ah(C.activity),
);

export default r;
