import { env } from '../config/env';

// Minimal Gemini REST client (generativelanguage.googleapis.com) — no SDK needed.
export async function geminiGenerateJSON<T>(prompt: string, timeoutMs = 60000): Promise<T> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  const model = env.GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt + '\n\nIMPORTANT: Respond with valid JSON only. No markdown fences, no commentary.' }] }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } finally {
    clearTimeout(t);
  }
}

export const DEFAULT_CHECKLIST = {
  checklist: [
    { section: 'Business goals', items: ['Primary business objectives', 'Success metrics / KPIs', 'Target users & personas'] },
    { section: 'Functional scope', items: ['Must-have features', 'Nice-to-have features', 'Explicit out-of-scope items'] },
    { section: 'Design & UX', items: ['Brand assets & style guide', 'Reference sites / inspiration', 'Key pages & user flows'] },
    { section: 'Technical', items: ['Existing systems & integrations', 'Hosting / domain access', 'Data migration needs'] },
    { section: 'Content & timeline', items: ['Content readiness', 'Hard deadlines & launch date', 'Budget range & approval process'] },
  ],
};
