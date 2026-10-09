import { Router } from "express";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { aiLimiter } from "../../middleware/rateLimit";
import { attachMembership } from "../../middleware/access";
import * as C from "./ai.controller";
import { checklistSchema, extractSchema, readinessSchema, acceptanceSchema, scopeAnalysisSchema, aiRunIdParam } from "./ai.schemas";

const r = Router();
r.use(aiLimiter);

r.post("/ai/checklist", requireAuth, validate(checklistSchema), ah(C.checklist));
r.post("/ai/extract", requireAuth, validate(extractSchema), ah(C.extract));
r.post("/ai/readiness", requireAuth, validate(readinessSchema), ah(C.readiness));
r.post("/ai/acceptance-criteria", requireAuth, validate(acceptanceSchema), ah(C.acceptance));
r.post("/ai/scope-analysis", requireAuth, validate(scopeAnalysisSchema), ah(C.scopeAnalysis));
r.get("/ai/runs/:id", requireAuth, validate(aiRunIdParam, "params"), attachMembership, ah(C.getRun));

export default r;
