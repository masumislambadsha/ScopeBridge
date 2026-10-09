import { prisma } from "../../lib/prisma";
import { AppError, notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";
import { Access } from "../../middleware/access";
import { audit } from "../../services/audit";
import { notify } from "../../services/notify";
import { assertMagic } from "../../middleware/upload";
import { uploadFile, deleteFile } from "../../services/storage";
import { filesQueue } from "../../queues/queues";

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export function parseAnswers(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") return parsed as Record<string, string>;
      return {};
    } catch {
      return { text: raw };
    }
  }
  return raw as Record<string, string>;
}

export async function createSubmission(
  access: Access,
  actorId: string,
  input: { projectId: string; informationRequestId?: string; answers: Record<string, string>; additionalInfo?: string },
  files: UploadedFile[],
) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");

  // clientId comes from access resolution, never the body (§2.2 D08).
  const clientId = access.kind === "CLIENT" ? access.clientId : project.clientId;

  if (input.informationRequestId) {
    const ir = await prisma.informationRequest.findUnique({
      where: { id: input.informationRequestId },
      select: { id: true, projectId: true },
    });
    if (!ir || ir.projectId !== input.projectId) {
      throw new AppError("VALIDATION_ERROR", "Information request does not belong to this project");
    }
  }

  // Upload first (outside the DB transaction), then persist rows; on DB failure
  // delete the uploaded objects so nothing is orphaned.
  const uploaded: Array<UploadedFile & { key: string; url: string | null }> = [];
  try {
    for (const f of files) {
      assertMagic(f.buffer, f.mimetype, f.originalname);
      const stored = await uploadFile(f.buffer, {
        originalName: f.originalname, mimeType: f.mimetype, size: f.size,
        projectId: input.projectId, folder: "scopebridge/submissions",
      });
      uploaded.push({ ...f, ...stored });
    }
  } catch (err) {
    for (const u of uploaded) await deleteFile(u.key);
    throw err;
  }

  let sub: { id: string };
  try {
    sub = await prisma.$transaction(async (tx) => {
      const created = await tx.submission.create({
        data: {
          projectId: input.projectId, clientId, submittedById: actorId,
          informationRequestId: input.informationRequestId ?? null,
          answers: input.answers as object, additionalInfo: input.additionalInfo,
          status: uploaded.length ? "PROCESSING" : "RECEIVED",
        },
      });
      for (const u of uploaded) {
        await tx.file.create({
          data: {
            projectId: input.projectId, submissionId: created.id, uploadedById: actorId,
            originalName: u.originalname, mimeType: u.mimetype, size: u.size,
            storageKey: u.key, url: u.url,
          },
        });
      }
      if (input.informationRequestId) {
        await tx.informationRequest.update({ where: { id: input.informationRequestId }, data: { status: "ANSWERED" } });
        // Linked clarification requirements return to DRAFT with the answer appended.
        const linked = await tx.requirement.findMany({ where: { clarificationRequestId: input.informationRequestId } });
        for (const r of linked) {
          const excerpt = Object.entries(input.answers).map(([k, v]) => `${k}: ${v}`).join("\n").slice(0, 2000);
          await tx.requirement.update({
            where: { id: r.id },
            data: {
              status: "DRAFT", clarificationRequestId: null,
              sourceContext: [r.sourceContext, `Clarification answer:\n${excerpt}`].filter(Boolean).join("\n\n").slice(0, 8000),
            },
          });
        }
      }
      return created;
    });
  } catch (err) {
    for (const u of uploaded) await deleteFile(u.key);
    throw err;
  }

  const fileRows = await prisma.file.findMany({ where: { submissionId: sub.id }, select: { id: true } });
  for (const f of fileRows) await filesQueue.add("extract", { fileId: f.id });

  await notify("submission.new", {
    projectId: input.projectId,
    title: "New client submission",
    body: input.informationRequestId ? "An information request was answered" : "Additional information submitted",
    link: `/projects/${input.projectId}`,
    entityType: "Submission", entityId: sub.id,
    excludeUserId: actorId,
  });
  await audit({ workspaceId: access.workspaceId, projectId: input.projectId, actorId, action: "submission.created", entityType: "Submission", entityId: sub.id });

  // Queue AI-02 extraction (auto). AiRun bookkeeping lives in the ai module.
  const { queueExtraction } = await import("../ai/ai.service");
  await queueExtraction(sub.id, input.projectId, actorId).catch(() => undefined);

  return prisma.submission.findUnique({
    where: { id: sub.id },
    include: { files: { select: { id: true, originalName: true, mimeType: true, size: true, extractionStatus: true, createdAt: true } } },
  });
}

export async function listSubmissions(access: Access, projectId: string, q: { informationRequestId?: string; page: number; limit: number }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  if (access.kind === "CLIENT" && project.clientId !== access.clientId) throw notFound("Project not found");
  const where = { projectId, ...(q.informationRequestId ? { informationRequestId: q.informationRequestId } : {}) };
  const { page, limit, skip, take } = paginate(q);
  const [total, data] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.findMany({
      where, skip, take, orderBy: { createdAt: "desc" },
      include: { files: { select: { id: true, originalName: true, mimeType: true, size: true, extractionStatus: true, createdAt: true } } },
    }),
  ]);
  return paged(data, total, page, limit);
}

export async function getSubmission(access: Access, id: string) {
  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      files: true,
      informationRequest: { select: { id: true, title: true, type: true } },
    },
  });
  if (!sub) throw notFound("Submission not found");
  const project = await prisma.project.findUnique({ where: { id: sub.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Submission not found");
  if (access.kind === "CLIENT" && project.clientId !== access.clientId) throw notFound("Submission not found");
  return sub;
}
