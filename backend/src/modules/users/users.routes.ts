import { Router } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate, validateAll } from "../../middleware/validate";
import * as C from "./users.controller";
import { usersQuerySchema, userIdParamSchema, patchUserSchema } from "./users.schemas";

const r = Router();
r.use(requireAuth);

r.get("/users", validate(usersQuerySchema, "query"), ah(C.list));
r.get("/users/:id", validate(userIdParamSchema, "params"), ah(C.get));
r.patch("/users/:id", validateAll({ params: userIdParamSchema, body: patchUserSchema }), ah(C.patch));

export default r;
