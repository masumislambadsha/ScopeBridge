import { Router } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { authLimiter } from "../../middleware/rateLimit";
import * as C from "./auth.controller";
import { registerSchema, loginSchema, forgotSchema, resetSchema } from "./auth.schemas";

const r = Router();

r.post("/register", authLimiter, validate(registerSchema), ah(C.register));
r.post("/login", authLimiter, validate(loginSchema), ah(C.login));
r.post("/logout", ah(C.logout));
r.post("/refresh", ah(C.refresh));
r.post("/forgot-password", authLimiter, validate(forgotSchema), ah(C.forgotPassword));
r.post("/reset-password", authLimiter, validate(resetSchema), ah(C.resetPassword));
r.get("/me", requireAuth, ah(C.getMe));

export default r;
