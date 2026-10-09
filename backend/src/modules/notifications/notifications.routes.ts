import { Router } from "express";
import { z } from "zod";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import * as C from "./notifications.controller";
import { notificationsQuerySchema, notificationIdParam, activityQuerySchema } from "./notifications.schemas";

const r = Router();
r.use(requireAuth);

r.get("/notifications", validate(notificationsQuerySchema, "query"), ah(C.list));
r.patch("/notifications/read-all", ah(C.markAllRead));
r.patch("/notifications/:id/read", validate(notificationIdParam, "params"), ah(C.markRead));
r.get(
  "/activity",
  validate(activityQuerySchema, "query"),
  ah(C.resolveActivityAccess),
  ah(C.activity),
);

export default r;
