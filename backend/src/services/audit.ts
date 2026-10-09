import { ActorType } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface AuditEntry {
  workspaceId: string;
  projectId?: string | null;
  actorId?: string | null;
  actorType?: ActorType;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/** Append-only activity log. No update/delete routes exist for ActivityLog. */
export async function audit(entry: AuditEntry) {
  return prisma.activityLog.create({
    data: {
      workspaceId: entry.workspaceId,
      projectId: entry.projectId ?? null,
      actorId: entry.actorId ?? null,
      actorType: entry.actorType ?? "USER",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: (entry.metadata ?? {}) as object,
    },
  });
}

export function diffMeta(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changed: Record<string, { before: unknown; after: unknown }> = {};
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      changed[k] = { before: before[k] ?? null, after: after[k] ?? null };
    }
  }
  return { changed };
}
