import fs from "fs";
import { prisma } from "../../lib/prisma";
import { notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";
import { Access } from "../../middleware/access";
import { audit } from "../../services/audit";
import { notify } from "../../services/notify";
import { assertMagic } from "../../middleware/upload";
import { uploadFile, deleteFile, localFilePath, getDownloadUrl } from "../../services/storage";
import { filesQueue } from "../../queues/queues";
import { env } from "../../config/env";

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export async function uploadFiles(
  access: Access,
  actorId: string,
  input: { projectId: string; submissionId?: string; changeRequestId?: string },
  files: UploadedFile[],
) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  if (input.submissionId) {
    const s = await prisma.submission.findUnique({ where: { id: input.submissionId }, select: { projectId: true } });
    if (!s || s.projectId !== input.projectId) throw notFound("Submission not found");
  }
  if (input.changeRequestId) {
    const c = await prisma.changeRequest.findUnique({ where: { id: input.changeRequestId }, select: { projectId: true } });
    if (!c || c.projectId !== input.projectId) throw notFound("Change request not found");
  }

  const uploaded: Array<UploadedFile & { key: string; url: string | null }> = [];
  try {
    for (const f of files) {
      assertMagic(f.buffer, f.mimetype, f.originalname);
      const stored = await uploadFile(f.buffer, {
        originalName: f.originalname, mimeType: f.mimetype, size: f.size,
        projectId: input.projectId, folder: "scopebridge/files",
      });
      uploaded.push({ ...f, ...stored });
    }
  } catch (err) {
    for (const u of uploaded) await deleteFile(u.key);
    throw err;
  }

  try {
    const rows = await prisma.$transaction(
      uploaded.map((u) =>
        prisma.file.create({
          data: {
            projectId: input.projectId, submissionId: input.submissionId ?? null,
            changeRequestId: input.changeRequestId ?? null, uploadedById: actorId,
            originalName: u.originalname, mimeType: u.mimetype, size: u.size,
            storageKey: u.key, url: u.url,
          },
        }),
      ),
    );
    for (const row of rows) await filesQueue.add("extract", { fileId: row.id });
    await notify("file.uploaded", {
      projectId: input.projectId, title: "Files uploaded",
      body: `${rows.length} file(s): ${rows.map((r) => r.originalName).join(", ").slice(0, 200)}`,
      link: `/projects/${input.projectId}`,
      entityType: "File", entityId: rows[0]?.id, excludeUserId: actorId,
    });
    await audit({ workspaceId: access.workspaceId, projectId: input.projectId, actorId, action: "file.uploaded", entityType: "File", entityId: rows[0]?.id, metadata: { count: rows.length } });
    return rows;
  } catch (err) {
    for (const u of uploaded) await deleteFile(u.key);
    throw err;
  }
}

export async function listFiles(access: Access, projectId: string, q: { submissionId?: string; changeRequestId?: string; page: number; limit: number }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("Project not found");
  if (access.kind === "CLIENT" && project.clientId !== access.clientId) throw notFound("Project not found");
  const where = {
    projectId,
    ...(q.submissionId ? { submissionId: q.submissionId } : {}),
    ...(q.changeRequestId ? { changeRequestId: q.changeRequestId } : {}),
  };
  const { page, limit, skip, take } = paginate(q);
  const [total, data] = await Promise.all([
    prisma.file.count({ where }),
    prisma.file.findMany({
      where, skip, take, orderBy: { createdAt: "desc" },
      select: { id: true, originalName: true, mimeType: true, size: true, extractionStatus: true, createdAt: true, uploadedBy: { select: { id: true, name: true } } },
    }),
  ]);
  return paged(data, total, page, limit);
}

/** Access-checked download: local driver streams bytes; cloudinary issues a signed URL. */
export async function downloadFile(access: Access, id: string): Promise<{ kind: "stream"; path: string; name: string; mime: string } | { kind: "redirect"; url: string }> {
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw notFound("File not found");
  const project = await prisma.project.findUnique({ where: { id: file.projectId } });
  if (!project || project.workspaceId !== access.workspaceId) throw notFound("File not found");
  if (access.kind === "CLIENT" && project.clientId !== access.clientId) throw notFound("File not found");
  if (env.STORAGE_DRIVER === "cloudinary") {
    const url = await getDownloadUrl(file.storageKey, file.originalName);
    if (url) return { kind: "redirect", url };
  }
  const p = localFilePath(file.storageKey);
  if (!fs.existsSync(p)) throw notFound("File not found");
  return { kind: "stream", path: p, name: file.originalName, mime: file.mimeType };
}
