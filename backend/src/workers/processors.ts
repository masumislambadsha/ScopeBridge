import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { aiExtractRequirements, aiReadiness, aiScopeDraft, aiAnalyzeChange } from '../services/ai.service';
import { emitToProject, emitToUser } from '../lib/socket';
import { notifyUser, notifyProjectMembers } from '../services/notify';

const connection = () => new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });
const backoffCfg = { attempts: 3, backoff: { type: 'exponential' as const, delay: 5000 } };

export function startWorkers() {
  // AI-02 extraction
  new Worker('ai-extraction', async (job) => {
    const { submissionId } = job.data as { submissionId: string };
    const sub = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!sub) return;
    try {
      const text = typeof sub.answers === 'string' ? sub.answers : JSON.stringify(sub.answers);
      const out = await aiExtractRequirements(text + (sub.fileUrl ? `\nFile: ${sub.fileUrl}` : ''));
      await prisma.$transaction(async (tx: any) => {
        for (const r of out.requirements) {
          await tx.requirement.create({
            data: {
              projectId: sub.projectId, submissionId: sub.id,
              title: r.title, description: r.description, category: r.category,
              priority: r.priority as any, source: 'AI', confidence: r.confidence, status: 'DRAFT',
            },
          });
        }
        await tx.submission.update({ where: { id: sub.id }, data: { status: 'EXTRACTED' } });
      });
      emitToProject(sub.projectId, 'ai:extraction:done', { submissionId: sub.id, count: out.requirements.length });
      await notifyProjectMembers(sub.projectId, { type: 'AI_EXTRACTION_DONE', title: 'AI extraction complete', body: `${out.requirements.length} requirements extracted`, entityId: sub.id, entityType: 'Submission' });
    } catch (e: any) {
      if (job.attemptsMade + 1 >= 3) {
        await prisma.submission.update({ where: { id: sub.id }, data: { status: 'AI_FAILED' } });
        emitToProject(sub.projectId, 'ai:extraction:failed', { submissionId: sub.id });
        await notifyProjectMembers(sub.projectId, { type: 'AI_EXTRACTION_FAILED', title: 'AI extraction failed — manual mode', body: 'Please create requirements manually', entityId: sub.id, entityType: 'Submission' });
      }
      throw e;
    }
  }, { connection: connection(), ...backoffCfg } as any);

  // AI-03 readiness
  new Worker('ai-readiness', async (job) => {
    const { projectId } = job.data as { projectId: string };
    const reqs = await prisma.requirement.findMany({ where: { projectId, status: 'ACCEPTED' } });
    if (!reqs.length) return { skipped: true };
    const out = await aiReadiness(reqs.map((r: any) => ({ title: r.title, description: r.description })));
    for (const r of reqs) {
      const ambiguous = out.ambiguousRequirementTitles.includes(r.title);
      await prisma.requirement.update({
        where: { id: r.id },
        data: { aiFlags: { readinessScore: out.readinessScore, missingInfo: out.missingInfo, ambiguous, contradictions: out.contradictions } },
      });
    }
    emitToProject(projectId, 'ai:scope:ready', { kind: 'readiness', score: out.readinessScore });
    return out;
  }, { connection: connection() } as any);

  // AI-04 scope draft
  new Worker('ai-scope', async (job) => {
    const { projectId, scopeId } = job.data as { projectId: string; scopeId: string };
    const reqs = await prisma.requirement.findMany({ where: { projectId, status: 'ACCEPTED' } });
    const draft = await aiScopeDraft(reqs.map((r: any) => ({ title: r.title, description: r.description, acceptanceCriteria: r.acceptanceCriteria })));
    const scope = await prisma.scope.update({
      where: { id: scopeId },
      data: { source: 'AI', features: draft.features as any, deliverables: draft.deliverables as any, exclusions: draft.exclusions as any, status: 'DRAFT' },
    });
    // also push acceptance criteria back to requirements where titles match
    for (const ac of draft.acceptanceCriteria) {
      const match = reqs.find((r: any) => r.title === ac.requirement);
      if (match) await prisma.requirement.update({ where: { id: match.id }, data: { acceptanceCriteria: ac.criteria as any } });
    }
    emitToProject(projectId, 'ai:scope:ready', { kind: 'scope-draft', scopeId: scope.id });
    await notifyProjectMembers(projectId, { type: 'AI_SCOPE_READY', title: 'AI scope draft ready', body: 'Review and edit before approval', entityId: scope.id, entityType: 'Scope' });
    return { scopeId: scope.id };
  }, { connection: connection() } as any);

  // AI-05 change analysis
  new Worker('ai-change-analysis', async (job) => {
    const { changeRequestId } = job.data as { changeRequestId: string };
    const cr = await prisma.changeRequest.findUnique({ where: { id: changeRequestId }, include: { scopeVersion: true } });
    if (!cr) return;
    try {
      const out = await aiAnalyzeChange(`${cr.title}\n${cr.description}`, cr.scopeVersion?.snapshot ?? {});
      await prisma.changeRequest.update({
        where: { id: cr.id },
        data: { aiClassification: out.classification as any, aiImpact: out.impact as any, aiRationale: out.rationale, status: 'ANALYZED' },
      });
      emitToProject(cr.projectId, 'change-request:analyzed', { id: cr.id, classification: out.classification });
      await notifyProjectMembers(cr.projectId, { type: 'CR_ANALYZED', title: 'Change request analyzed', body: out.classification, entityId: cr.id, entityType: 'ChangeRequest' });
    } catch {
      await prisma.changeRequest.update({ where: { id: cr.id }, data: { status: 'NEEDS_MANUAL_REVIEW' } });
      emitToProject(cr.projectId, 'change-request:analyzed', { id: cr.id, manual: true });
    }
  }, { connection: connection() } as any);

  // reminders: deadline approaching
  new Worker('reminders', async () => {
    const soon = new Date(Date.now() + 48 * 3600 * 1000);
    const tasks = await prisma.task.findMany({ where: { deadline: { lte: soon }, status: { not: 'COMPLETED' } }, include: { assignee: true } });
    for (const t of tasks) {
      if (t.assigneeId) await notifyUser(t.assigneeId, { type: 'DEADLINE', title: 'Deadline approaching', body: t.title, entityId: t.id, entityType: 'Task' });
    }
    const reqs = await prisma.informationRequest.findMany({ where: { deadline: { lte: soon }, status: 'SENT' } });
    for (const r of reqs) emitToProject(r.projectId, 'notification:new', { type: 'DEADLINE', title: 'Info request due soon', entityId: r.id });
  }, { connection: connection() } as any);

  console.log('[worker] BullMQ workers started');
}
