/**
 * Client DTO serializers — clients must never see agency-internal data:
 * drafts, INTERNAL messages, AI internals, task assignees, other clients, members.
 * Services filter collections (e.g. exclude DRAFT versions); serializers strip fields.
 */

function pick<T extends object>(obj: T, keys: Array<keyof T>): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

export function projectDTO(p: Record<string, unknown>) {
  return pick(p, ["id", "name", "description", "projectType", "projectTypeLabel", "startDate", "deadline", "status", "createdAt", "updatedAt", "client", "progress"]);
}

export function requirementDTO(r: Record<string, unknown>) {
  const { aiFlags, confidence, ...rest } = r;
  void aiFlags;
  void confidence;
  return pick(rest, [
    "id", "code", "title", "description", "category", "priority", "status",
    "acceptanceCriteria", "sourceContext", "createdAt", "updatedAt",
  ]);
}

export function scopeVersionDTO(v: Record<string, unknown>) {
  return pick(v, [
    "id", "version", "status", "summary", "features", "deliverables",
    "exclusions", "priority", "deadline", "createdAt", "submittedAt", "approvedAt",
  ]);
}

export function messageDTO(m: Record<string, unknown>) {
  return pick(m, ["id", "content", "visibility", "createdAt", "sender"]);
}

export function senderDTO(s: Record<string, unknown>) {
  return pick(s, ["id", "name"]);
}

export function approvalDTO(a: Record<string, unknown>) {
  return pick(a, [
    "id", "status", "comment", "signatureName", "decidedAt", "createdAt",
    "scopeVersion", "contentHash",
  ]);
}

/** Progress-only task view for clients. */
export function taskProgressDTO(t: Record<string, unknown>) {
  return pick(t, ["id", "code", "title", "status", "priority", "deadline"]);
}

export function changeRequestDTO(c: Record<string, unknown>) {
  const { aiSuggestedRequirements, ...rest } = c;
  void aiSuggestedRequirements;
  return rest;
}
