import crypto from "crypto";
import { AiFeature } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError, notFound } from "../../core/http";
import { Access } from "../../middleware/access";
import { aiQueue } from "../../queues/queues";
import { getProvider, CHECKLIST_TEMPLATES, ChecklistOutput } from "../../services/ai/provider";
import { emitTeam } from "../../services/realtime";
import { audit } from "../../services/audit";

export async function createRun(input: {
  feature: AiFeature; projectId?: string; entityType?: string; entityId?: string; createdById?: string;
}) {
  return prisma.aiRun.create({
    data: { ...input, status: "QUEUED", model: process.env.AI_PROVIDER === "gemini" ? "gemini" : "mock" },
  });
}

export async function getRun(access: Access, id: string) {
  const run = await prisma.aiRun.findUnique({ where: { id } });
  if (!run) throw notFound("AI run not found");
  if (run.projectId) {
    const project = await prisma.project.findUnique({ where: { id: run.projectId }, select: { workspaceId: true } });
    if (!project || project.workspaceId !== access.workspaceId) throw notFound("AI run not found");
  }
  return run;
}

/** AI-01 (sync with timeout). Returns { source: 'AI'|'TEMPLATE', sections }. */
export async function checklist(projectType: string, timeoutMs = 25000) {
  const started = Date.now();
  try {
    const provider = getProvider();
    const out = await provider.generateJSON<typeof ChecklistOutput._type>({
      system: "MOCK:checklist. Generate a client information-collection checklist. Respond with JSON {sections:[{title,items:[{key,question,why,required,answerType,options}]}]}.",
      user: `Project type: ${projectType}. Sections must cover business, functional, design, technical, content/timeline aspects.`,
      schema: ChecklistOutput,
      timeoutMs,
    });
    if (!out.sections?.length) throw new Error("empty checklist");
    void started;
    return { source: "AI" as const, sections: out.sections };
  } catch {
    const t = CHECKLIST_TEMPLATES[projectType] ?? CHECKLIST_TEMPLATES.CUSTOM;
    return {
      source: "TEMPLATE" as const,
      sections: [{ title: t.title, items: t.items.map((i) => ({ ...i, options: i.options ?? [] })) }],
    };
  }
}

/** Enqueue with failure handling: a queue-add failure marks the run FAILED (no orphaned QUEUED runs). */
async function enqueue(runId: string, add: () => Promise<unknown>) {
  try {
    await add();
  } catch (err) {
    await failRun(runId, err instanceof Error ? err.message : String(err), false);
    throw err;
  }
}

/** Queue AI-02 for a submission → 202 { aiRunId }. Also auto-called on submission. */
export async function queueExtraction(submissionId: string, projectId: string, actorId: string) {
  const run = await createRun({ feature: "EXTRACTION", projectId, entityType: "Submission", entityId: submissionId, createdById: actorId });
  await enqueue(run.id, () => aiQueue.add("extract", { aiRunId: run.id, submissionId }, { jobId: `extract-${submissionId}-${run.id}` }));
  return run;
}

export async function queueReadiness(projectId: string, actorId: string) {
  const run = await createRun({ feature: "READINESS", projectId, entityType: "Project", entityId: projectId, createdById: actorId });
  await enqueue(run.id, () => aiQueue.add("readiness", { aiRunId: run.id, projectId }, { jobId: `readiness-${projectId}-${run.id}` }));
  return run;
}

export async function queueAcceptance(
  input: { requirementIds?: string[]; scopeVersionId?: string; replace: boolean },
  projectId: string,
  actorId: string,
) {
  const run = await createRun({ feature: "ACCEPTANCE_CRITERIA", projectId, entityType: input.scopeVersionId ? "ScopeVersion" : "Requirement", entityId: input.scopeVersionId ?? input.requirementIds?.[0], createdById: actorId });
  await enqueue(run.id, () => aiQueue.add("acceptance", { aiRunId: run.id, projectId, ...input }, { jobId: `acceptance-${run.id}` }));
  return run;
}

export async function queueScopeAnalysis(changeRequestId: string, projectId: string, actorId: string) {
  const run = await createRun({ feature: "SCOPE_CHANGE", projectId, entityType: "ChangeRequest", entityId: changeRequestId, createdById: actorId });
  await enqueue(run.id, () => aiQueue.add("scope-change", { aiRunId: run.id, changeRequestId }, { jobId: `scope-change-${changeRequestId}-${run.id}` }));
  return run;
}

export async function finishRun(id: string, output: unknown, latencyMs: number, model: string) {
  const run = await prisma.aiRun.update({
    where: { id }, data: { status: "COMPLETED", output: output as object, latencyMs, model, finishedAt: new Date() },
  });
  if (run.projectId) {
    await emitTeam(run.projectId, "ai:run:updated", { aiRunId: id, feature: run.feature, status: "COMPLETED" });
  }
  return run;
}

export async function failRun(id: string, error: string, notifyProject = true) {
  const run = await prisma.aiRun.update({
    where: { id }, data: { status: "FAILED", error: error.slice(0, 2000), finishedAt: new Date() },
  });
  if (run.projectId) {
    await emitTeam(run.projectId, "ai:run:updated", { aiRunId: id, feature: run.feature, status: "FAILED", error });
    if (notifyProject) {
      const { notify } = await import("../../services/notify");
      const project = await prisma.project.findUnique({ where: { id: run.projectId }, select: { id: true } });
      if (project) {
        await notify("ai.failed", {
          projectId: project.id, title: "AI job failed — manual mode",
          body: `${run.feature} failed after retries. Continue manually or retry.`,
          link: `/projects/${project.id}`, entityType: "AiRun", entityId: id,
        });
      }
    }
  }
  const project = run.projectId ? await prisma.project.findUnique({ where: { id: run.projectId }, select: { workspaceId: true } }) : null;
  if (project) {
    await audit({
      workspaceId: project.workspaceId, projectId: run.projectId,
      action: "ai.failed", entityType: "AiRun", entityId: id,
      metadata: { feature: run.feature, error: error.slice(0, 500) },
    });
  }
  return run;
}

/** Normalize + verify that an excerpt actually appears in the input (AI-02 anti-hallucination). */
export function verifyExcerpt(excerpt: string, haystack: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const n = norm(excerpt);
  if (n.length < 12) return false;
  return norm(haystack).includes(n);
}

export function contentHashOf(content: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export function assertAiTrigger(access: Access) {
  if (access.kind !== "MEMBER" || (access.role !== "ADMIN" && access.role !== "PROJECT_MANAGER")) {
    throw new AppError("VALIDATION_ERROR", "Only admins and project managers can trigger AI");
  }
}
