import { z } from 'zod';
import { geminiGenerateJSON, DEFAULT_CHECKLIST } from '../lib/gemini';

export const ExtractedRequirementSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  category: z.string().default('general'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  confidence: z.number().min(0).max(1).default(0.5),
});
export const ExtractionOutputSchema = z.object({ requirements: z.array(ExtractedRequirementSchema) });

export const ReadinessOutputSchema = z.object({
  readinessScore: z.number().min(0).max(100),
  missingInfo: z.array(z.string()).default([]),
  ambiguousRequirementTitles: z.array(z.string()).default([]),
  contradictions: z.array(z.string()).default([]),
});

export const ScopeDraftSchema = z.object({
  features: z.array(z.object({ title: z.string(), description: z.string().default('') })).default([]),
  deliverables: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.object({ requirement: z.string(), criteria: z.array(z.string()) })).default([]),
});

export const ChangeAnalysisSchema = z.object({
  classification: z.enum(['IN_SCOPE', 'OUT_OF_SCOPE', 'POSSIBLY_RELATED']),
  matchedScopeItems: z.array(z.string()).default([]),
  impact: z.object({
    effortDays: z.number().default(0),
    timelineRisk: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('LOW'),
    affectedDeliverables: z.array(z.string()).default([]),
  }),
  rationale: z.string().default(''),
});

export async function aiChecklist(projectType: string) {
  try {
    const out = await geminiGenerateJSON<{ checklist: Array<{ section: string; items: string[] }> }>(
      `Generate a client information-collection checklist for a "${projectType}" software project. Return JSON: {"checklist":[{"section":"...","items":["..."]}]}`,
      20000
    );
    if (!out?.checklist?.length) throw new Error('empty');
    return out;
  } catch {
    return DEFAULT_CHECKLIST; // fallback
  }
}

export async function aiExtractRequirements(submissionText: string) {
  const out = await geminiGenerateJSON(
    `Extract structured software requirements from this client submission. Return JSON {"requirements":[{"title":"...","description":"...","category":"...","priority":"LOW|MEDIUM|HIGH|CRITICAL","confidence":0.0-1.0}]}.\n\nSUBMISSION:\n${submissionText.slice(0, 12000)}`
  );
  return ExtractionOutputSchema.parse(out);
}

export async function aiReadiness(requirements: Array<{ title: string; description?: string | null }>) {
  const out = await geminiGenerateJSON(
    `Analyze these requirements for readiness. Return JSON {"readinessScore":0-100,"missingInfo":[],"ambiguousRequirementTitles":[],"contradictions":[]}.\n\nREQUIREMENTS:\n${JSON.stringify(requirements).slice(0, 12000)}`
  );
  return ReadinessOutputSchema.parse(out);
}

export async function aiScopeDraft(requirements: Array<{ title: string; description?: string | null; acceptanceCriteria?: unknown }>) {
  const out = await geminiGenerateJSON(
    `Create a scope draft from accepted requirements. Features, deliverables, exclusions, and Given/When/Then acceptance criteria. Return JSON {"features":[{"title":"","description":""}],"deliverables":[],"exclusions":[],"acceptanceCriteria":[{"requirement":"","criteria":["Given... When... Then..."]}]}.\n\nREQUIREMENTS:\n${JSON.stringify(requirements).slice(0, 12000)}`
  );
  return ScopeDraftSchema.parse(out);
}

export async function aiAnalyzeChange(changeText: string, scopeSnapshot: unknown) {
  const out = await geminiGenerateJSON(
    `Classify this change request against the approved scope snapshot. Return JSON {"classification":"IN_SCOPE|OUT_OF_SCOPE|POSSIBLY_RELATED","matchedScopeItems":[],"impact":{"effortDays":0,"timelineRisk":"LOW|MEDIUM|HIGH","affectedDeliverables":[]},"rationale":"..."}.\n\nCHANGE:\n${changeText.slice(0, 8000)}\n\nAPPROVED SCOPE:\n${JSON.stringify(scopeSnapshot).slice(0, 12000)}`
  );
  return ChangeAnalysisSchema.parse(out);
}
