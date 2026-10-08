import { Response } from 'express';
import { z } from 'zod';
import { AuthedRequest } from '../middleware/auth';
import { aiChecklist } from '../services/ai.service';
import { aiReadinessQueue, aiScopeQueue } from '../queues/queues';

const checklistSchema = z.object({ projectType: z.string().min(1) });

export async function postChecklist(req: AuthedRequest, res: Response) {
  const { projectType } = checklistSchema.parse(req.body);
  const out = await aiChecklist(projectType); // sync with hardcoded fallback
  res.json({ data: out });
}
export async function postExtract(req: AuthedRequest, res: Response) {
  // sync extract endpoint kept for manual trigger docs; real flow is background via submissions
  res.json({ data: { queued: false, message: 'Use POST /api/submissions to trigger background extraction (AI-02)' } });
}
export async function postReadiness(req: AuthedRequest, res: Response) {
  const schema = z.object({ projectId: z.string().min(1) });
  const { projectId } = schema.parse(req.body);
  await aiReadinessQueue.add('readiness', { projectId });
  res.json({ data: { queued: true } });
}
export async function postAcceptanceCriteria(req: AuthedRequest, res: Response) {
  const schema = z.object({ projectId: z.string().min(1), scopeId: z.string().min(1) });
  const input = schema.parse(req.body);
  await aiScopeQueue.add('scope-draft', input);
  res.json({ data: { queued: true } });
}
export async function postScopeAnalysis(req: AuthedRequest, res: Response) {
  const { aiChangeQueue } = await import('../queues/queues');
  const schema = z.object({ changeRequestId: z.string().min(1) });
  const { changeRequestId } = schema.parse(req.body);
  await aiChangeQueue.add('analyze', { changeRequestId });
  res.json({ data: { queued: true } });
}
