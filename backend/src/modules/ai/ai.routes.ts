import { Router } from "express";
import { z } from "zod";
import { ah } from "../../core/http";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { aiLimiter } from "../../middleware/rateLimit";
import { attachMembership } from "../../middleware/access";
import * as C from "./ai.controller";
import { checklistSchema, extractSchema, readinessSchema, acceptanceSchema, scopeAnalysisSchema, aiRunIdParam } from "./ai.schemas";

const r = Router();
r.use(requireAuth);
r.use(aiLimiter);

r.post("/ai/checklist", validate(checklistSchema), ah(C.checklist));
r.post("/ai/extract", validate(extractSchema), ah(C.extract));
r.post("/ai/readiness", validate(readinessSchema), ah(C.readiness));
r.post("/ai/acceptance-criteria", validate(acceptanceSchema), ah(C.acceptance));
r.post("/ai/scope-analysis", validate(scopeAnalysisSchema), ah(C.scopeAnalysis));
r.get("/ai/runs/:id", validate(aiRunIdParam, "params"), attachMembership, ah(C.getRun));

export default r;
