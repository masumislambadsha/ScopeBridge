import { Router } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { requireProjectAccess } from "../../middleware/access";
import * as C from "./messages.controller";
import { createMessageSchema, messagesQuerySchema } from "./messages.schemas";

const r = Router();
r.use(requireAuth);

r.post(
  "/messages",
  validate(createMessageSchema),
  requireProjectAccess("message.write", (req) => (req.body as { projectId?: string }).projectId),
  ah(C.create),
);
r.get(
  "/messages",
  validate(messagesQuerySchema, "query"),
  requireProjectAccess("message.read", (req) => (req.query as { projectId?: string }).projectId),
  ah(C.list),
);

export default r;
