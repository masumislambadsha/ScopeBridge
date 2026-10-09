import { Job } from "bullmq";
import { prisma } from "../../lib/prisma";
import { logger } from "../../core/logger";
import { getProvider, ExtractionOutput, ReadinessOutput, AcceptanceOutput, ScopeChangeOutput, InlinePart } from "../../services/ai/provider";
import { finishRun, failRun, verifyExcerpt, queueReadiness } from "../../modules/ai/ai.service";
import { audit } from "../../services/audit";
import { notify } from "../../services/notify";
import { emitTeam } from "../../services/realtime";
import { localFilePath } from "../../services/storage";
import { env } from "../../config/env";
import fs from "fs";

const SYSTEM = "You are ScopeBridge, a precise software-scope analyst. Output JSON only, matching the requested schema.";

function cap(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…[truncated]" : s;
}

async function fileBytes(storageKey: string, url: string | null, _mimeType: string): Promise<Buffer | null> {
  try {
    if (env.STORAGE_DRIVER === "local") return await fs.promises.readFile(localFilePath(storageKey));
    if (url) {
      const res = await fetch(url);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    }
  } catch (e) {
    logger.warn("[ai] file bytes unreadable", { err: String(e) });
  }
  return null;
}

async function submissionInputs(submissionId: string) {
  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { files: true, informationRequest: { select: { id: true, title: true, questions: true } } },
  });
  if (!sub) throw new Error("Submission not found");
  const questions = (Array.isArray(sub.informationRequest?.questions) ? sub.informationRequest!.questions : []) as Array<{ id: string; question: string }>;
  const qmap = new Map(questions.map((q) => [q.id, q.question]));
  const answers = (sub.answers ?? {}) as Record<string, string>;
  const pairs = Object.entries(answers).map(([k, v]) => `Q: ${qmap.get(k) ?? k}\nA: ${v}`).join("\n\n");
  const texts: string[] = [];
  const inlineParts: InlinePart[] = [];
  for (const f of sub.files) {
    if (f.extractedText) texts.push(`--- FILE ${f.originalName} ---\n${cap(f.extractedText, 8000)}`);
    if ((f.mimeType.startsWith("image/") || f.mimeType === "application/pdf") && inlineParts.length < 4) {
      const bytes = await fileBytes(f.storageKey, f.url, f.mimeType);
      if (bytes && bytes.length < 8 * 1024 * 1024) inlineParts.push({ mimeType: f.mimeType, base64: bytes.toString("base64") });
    }
  }
  const combined = [`INFORMATION REQUEST: ${sub.informationRequest?.title ?? "(none)"}`, `ANSWERS:\n${pairs}`, sub.additionalInfo ? `ADDITIONAL INFO:\n${sub.additionalInfo}` : "", texts.join("\n\n")].filter(Boolean).join("\n\n");
  return { sub, combined, inlineParts };
}

export async function processExtract(job: Job<{ aiRunId: string; submissionId: string }>) {
  const { aiRunId, submissionId } = job.data;
  const started = Date.now();
  const { sub, combined, inlineParts } = await submissionInputs(submissionId);
  const provider = getProvider();
  try {
    const out = await provider.generateJSON<typeof ExtractionOutput._type>({
      system: `${SYSTEM} MOCK:extraction.`,
      user: `Extract structured software requirements from this client submission. Return {"requirements":[{"title","description","category","priority","sourceType":"ANSWER"|"FILE","sourceRef","sourceExcerpt","confidence"}]}. sourceExcerpt must be a verbatim quote.\n\nSUBMISSION:\n${cap(combined, 20000)}`,
      schema: ExtractionOutput,
      inlineParts,
    });
    const existingCount = await prisma.requirement.count({ where: { submissionId, source: "AI", status: "DRAFT" } });
    if (!(job.attemptsMade > 0 && existingCount > 0)) {
      const existing = await prisma.requirement.findMany({ where: { projectId: sub.projectId, status: { not: "REJECTED" } }, select: { title: true } });
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const titles = new Set(existing.map((e) => norm(e.title)));
      await prisma.$transaction(async (tx) => {
        for (const r of out.requirements) {
          const verified = verifyExcerpt(r.sourceExcerpt, combined);
          const p = await tx.project.update({ where: { id: sub.projectId }, data: { requirementSeq: { increment: 1 } } });
          await tx.requirement.create({
            data: {
              projectId: sub.projectId, code: `REQ-${String(p.requirementSeq).padStart(3, "0")}`,
              title: r.title.slice(0, 200), description: r.description,
              category: r.category, priority: r.priority as never,
              status: "DRAFT", source: "AI",
              sourceContext: [r.sourceType === "FILE" ? `file:${r.sourceRef}` : `answer:${r.sourceRef}`, `excerpt: ${r.sourceExcerpt}`].join("\n"),
              submissionId,
              confidence: verified ? r.confidence : Math.min(r.confidence, 0.4),
              aiFlags: { excerptVerified: verified, possibleDuplicate: titles.has(norm(r.title)) },
              createdById: null,
            },
          });
        }
        await tx.submission.update({ where: { id: submissionId }, data: { status: "EXTRACTED" } });
      });
    }
    await finishRun(aiRunId, { count: out.requirements.length }, Date.now() - started, provider.name);
    const project = await prisma.project.findUnique({ where: { id: sub.projectId }, select: { workspaceId: true } });
    if (project) {
      await audit({ workspaceId: project.workspaceId, projectId: sub.projectId, action: "ai.completed", entityType: "AiRun", entityId: aiRunId, actorType: "AI", metadata: { feature: "EXTRACTION" } });
      await notify("ai.completed", { projectId: sub.projectId, title: "AI extraction complete", body: `${out.requirements.length} requirement(s) extracted`, link: `/projects/${sub.projectId}`, entityType: "AiRun", entityId: aiRunId });
      await emitTeam(sub.projectId, "requirement:updated", { projectId: sub.projectId });
    }
    // Auto-queue readiness.
    const run = await prisma.aiRun.findUnique({ where: { id: aiRunId }, select: { createdById: true } });
    await queueReadiness(sub.projectId, run?.createdById ?? "").catch(() => undefined);
  } catch (err) {
    await handleAiFailure(job, aiRunId, err, async () => {
      await prisma.submission.update({ where: { id: submissionId }, data: { status: "AI_FAILED" } }).catch(() => undefined);
    });
    throw err;
  }
}

export async function processReadiness(job: Job<{ aiRunId: string; projectId: string }>) {
  const { aiRunId, projectId } = job.data;
  const started = Date.now();
  const provider = getProvider();
  try {
    const reqs = await prisma.requirement.findMany({
      where: { projectId, status: { not: "REJECTED" } },
      select: { code: true, title: true, description: true, category: true, priority: true },
      orderBy: { code: "asc" },
    });
    if (!reqs.length) {
      await finishRun(aiRunId, { skipped: true }, Date.now() - started, provider.name);
      return;
    }
    const out = await provider.generateJSON<typeof ReadinessOutput._type>({
      system: `${SYSTEM} MOCK:readiness.`,
      user: `Analyze readiness of these requirements (identify by CODE): ${cap(JSON.stringify(reqs), 20000)}. Return {readinessScore,summary,missingInformation[{topic,question,relatedCodes}],ambiguous[{code,issue,suggestedQuestion}],contradictions[{codes,issue}],incomplete[{code,issue}],unclear[{code,issue}],perRequirement[{code,verdict:READY|NEEDS_CLARIFICATION,reasons}]}`,
      schema: ReadinessOutput,
    });
    await prisma.$transaction(async (tx) => {
      await tx.readinessReport.create({
        data: {
          projectId, aiRunId, score: out.readinessScore, summary: out.summary,
          missingInformation: out.missingInformation as object, ambiguous: out.ambiguous as object,
          contradictions: out.contradictions as object, incomplete: out.incomplete as object,
          unclear: out.unclear as object, perRequirement: out.perRequirement as object,
        },
      });
      const byCode = new Map(out.perRequirement.map((p) => [p.code, p]));
      for (const r of reqs) {
        const verdict = byCode.get(r.code);
        await tx.requirement.update({
          where: { projectId_code: { projectId, code: r.code } },
          data: { aiFlags: { readiness: verdict ?? null, score: out.readinessScore } },
        });
      }
    });
    await finishRun(aiRunId, { score: out.readinessScore }, Date.now() - started, provider.name);
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
    if (project) {
      await audit({ workspaceId: project.workspaceId, projectId, action: "ai.completed", entityType: "AiRun", entityId: aiRunId, actorType: "AI", metadata: { feature: "READINESS", score: out.readinessScore } });
      await notify("ai.completed", { projectId, title: `Readiness: ${out.readinessScore}%`, body: out.summary?.slice(0, 200), link: `/projects/${projectId}`, entityType: "AiRun", entityId: aiRunId });
      await emitTeam(projectId, "requirement:updated", { projectId });
    }
  } catch (err) {
    await handleAiFailure(job, aiRunId, err);
    throw err;
  }
}

export async function processAcceptance(job: Job<{ aiRunId: string; projectId: string; requirementIds?: string[]; scopeVersionId?: string; replace: boolean }>) {
  const { aiRunId, projectId, requirementIds, scopeVersionId, replace } = job.data;
  const started = Date.now();
  const provider = getProvider();
  try {
    let reqs = await prisma.requirement.findMany({
      where: requirementIds?.length ? { id: { in: requirementIds }, projectId } : { projectId, status: { in: ["READY", "APPROVED", "DRAFT"] } },
      select: { id: true, code: true, title: true, description: true, acceptanceCriteriaStatus: true },
    });
    if (scopeVersionId) {
      const links = await prisma.scopeVersionRequirement.findMany({ where: { scopeVersionId }, select: { requirementId: true } });
      const ids = new Set(links.map((l) => l.requirementId));
      // If the draft has no linked requirements yet (fresh v1), draft criteria
      // for all eligible project requirements so the PM can build features from them.
      if (ids.size) reqs = reqs.filter((r) => ids.has(r.id));
    }
    const out = await provider.generateJSON<typeof AcceptanceOutput._type>({
      system: `${SYSTEM} MOCK:acceptance.`,
      user: `Write 2-6 testable Given/When/Then acceptance criteria per requirement (identify by CODE): ${cap(JSON.stringify(reqs.map((r) => ({ code: r.code, title: r.title, description: r.description }))), 20000)}. Return {items:[{code,criteria:[{given,when,then}]}]}`,
      schema: AcceptanceOutput,
    });
    const byCode = new Map(out.items.map((i) => [i.code, i.criteria]));
    await prisma.$transaction(async (tx) => {
      for (const r of reqs) {
        const criteria = byCode.get(r.code);
        if (!criteria) continue;
        if (r.acceptanceCriteriaStatus === "REVIEWED" && !replace) continue;
        await tx.requirement.update({
          where: { id: r.id },
          data: { acceptanceCriteria: criteria as object, acceptanceCriteriaStatus: "AI_DRAFT" },
        });
      }
      if (scopeVersionId) {
        const v = await tx.scopeVersion.findUnique({ where: { id: scopeVersionId } });
        if (v && v.status === "DRAFT") {
          const features = ((v.features ?? []) as Array<Record<string, unknown>>).map((f) => {
            const crit = (f.requirementIds as string[] ?? []).flatMap((rid) => {
              const rr = reqs.find((x) => x.id === rid);
              return rr?.acceptanceCriteriaStatus === "REVIEWED" && !replace ? [] : (byCode.get(rr?.code ?? "") ?? []);
            });
            return crit.length ? { ...f, acceptanceCriteria: crit } : f;
          });
          await tx.scopeVersion.update({ where: { id: scopeVersionId }, data: { features: features as object } });
        }
      }
    });
    await finishRun(aiRunId, { count: out.items.length }, Date.now() - started, provider.name);
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
    if (project) {
      await audit({ workspaceId: project.workspaceId, projectId, action: "ai.completed", entityType: "AiRun", entityId: aiRunId, actorType: "AI", metadata: { feature: "ACCEPTANCE_CRITERIA" } });
      await notify("ai.completed", { projectId, title: "Acceptance criteria drafted", body: `${out.items.length} requirement(s)`, link: `/projects/${projectId}`, entityType: "AiRun", entityId: aiRunId });
      await emitTeam(projectId, "scope:version:updated", { projectId });
    }
  } catch (err) {
    await handleAiFailure(job, aiRunId, err);
    throw err;
  }
}

export async function processScopeChange(job: Job<{ aiRunId: string; changeRequestId: string }>) {
  const { aiRunId, changeRequestId } = job.data;
  const started = Date.now();
  const provider = getProvider();
  try {
    const cr = await prisma.changeRequest.findUnique({
      where: { id: changeRequestId },
      include: {
        baseScopeVersion: true,
        files: true,
        project: { select: { id: true, workspaceId: true } },
      },
    });
    if (!cr) throw new Error("Change request not found");
    const fileTexts: string[] = [];
    const inlineParts: InlinePart[] = [];
    for (const f of cr.files) {
      if (f.extractedText) fileTexts.push(`--- FILE ${f.originalName} ---\n${cap(f.extractedText, 6000)}`);
      if ((f.mimeType.startsWith("image/") || f.mimeType === "application/pdf") && inlineParts.length < 4) {
        const bytes = await fileBytes(f.storageKey, f.url, f.mimeType);
        if (bytes && bytes.length < 8 * 1024 * 1024) inlineParts.push({ mimeType: f.mimeType, base64: bytes.toString("base64") });
      }
    }
    const base = cr.baseScopeVersion;
    const baseJson = base ? { features: base.features, deliverables: base.deliverables, exclusions: base.exclusions } : {};
    const out = await provider.generateJSON<typeof ScopeChangeOutput._type>({
      system: `${SYSTEM} MOCK:scopechange. Anything matching an EXCLUSION is OUT_OF_SCOPE.`,
      user: `Classify this change request against the approved scope. Return {classification,confidence,matchedScopeItems[{featureId,title,reason}],impact:{additionalDevelopmentWork{level,description},databaseChanges{required,description},apiChanges{required,description},uiChanges{required,description},timelineImpact{estimatedDays,description},estimatedEffortHours},rationale,suggestedRequirements[{title,description,priority}]}\n\nCHANGE:\n${cap(`${cr.title}\n${cr.description}\n${fileTexts.join("\n")}`, 12000)}\n\nAPPROVED SCOPE:\n${cap(JSON.stringify(baseJson), 14000)}`,
      schema: ScopeChangeOutput,
      inlineParts,
    });
    await prisma.changeRequest.update({
      where: { id: cr.id },
      data: {
        aiClassification: out.classification, aiImpact: out.impact as object,
        aiRationale: out.rationale, aiMatchedItems: out.matchedScopeItems as object,
        aiSuggestedRequirements: out.suggestedRequirements as object, aiAnalyzedAt: new Date(),
      },
    });
    await finishRun(aiRunId, { classification: out.classification }, Date.now() - started, provider.name);
    await audit({ workspaceId: cr.project.workspaceId, projectId: cr.project.id, action: "ai.completed", entityType: "AiRun", entityId: aiRunId, actorType: "AI", metadata: { feature: "SCOPE_CHANGE", classification: out.classification } });
    await audit({ workspaceId: cr.project.workspaceId, projectId: cr.project.id, action: "cr.analyzed", entityType: "ChangeRequest", entityId: cr.id, actorType: "AI", metadata: { classification: out.classification } });
    await emitTeam(cr.project.id, "change-request:updated", { projectId: cr.project.id, entityId: cr.id });
  } catch (err) {
    await handleAiFailure(job, aiRunId, err);
    throw err;
  }
}

/** Final-failure path: FAILED run + PM notification + manual-mode UI signal. */
async function handleAiFailure(job: Job, aiRunId: string, err: unknown, extra?: () => Promise<void>) {
  const maxAttempts = job.opts.attempts ?? 3;
  if (job.attemptsMade + 1 >= (typeof maxAttempts === "number" ? maxAttempts : 3)) {
    try {
      if (extra) await extra();
    } catch (e) {
      logger.warn("[ai] failure side-effect failed", { err: String(e) });
    }
    await failRun(aiRunId, err instanceof Error ? err.message : String(err)).catch((e) => logger.error("[ai] failRun failed", { err: String(e) }));
  }
}
