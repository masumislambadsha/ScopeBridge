import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from '../middleware/auth';
import { paginate, paged } from '../utils/pagination';
import { assertProjectAccess } from '../middleware/rbac';
import { assertMagic } from '../middleware/upload';
import { uploadBufferToCloudinary } from '../lib/cloudinary';
import { aiExtractionQueue } from '../queues/queues';
import { emitToProject } from '../lib/socket';

const createSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  informationRequestId: z.string().optional(),
  answers: z.any().default({}),
});

export async function createSubmission(req: AuthedRequest, res: Response) {
  const input = createSchema.parse(req.body);
  if (!(await assertProjectAccess(req.userId!, input.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  let fileUrl: string | undefined; let filePublicId: string | undefined;
  const file = (req as any).file as Express.Multer.File | undefined;
  if (file) {
    assertMagic(file.buffer, file.mimetype);
    // All file bytes go to Cloudinary — never stored on server
    const uploaded = await uploadBufferToCloudinary(file.buffer, { folder: 'scopebridge/submissions', resourceType: 'auto' });
    fileUrl = uploaded.secure_url; filePublicId = uploaded.public_id;
  }
  const sub = await prisma.$transaction(async (tx: any) => {
    const s = await tx.submission.create({
      data: {
        projectId: input.projectId, clientId: input.clientId,
        informationRequestId: input.informationRequestId ?? null,
        answers: (typeof input.answers === 'string' ? { text: input.answers } : input.answers) as any,
        fileUrl, filePublicId, status: 'PROCESSING',
      },
    });
    if (input.informationRequestId) {
      await tx.informationRequest.update({ where: { id: input.informationRequestId }, data: { status: 'ANSWERED' } });
    }
    return s;
  });
  emitToProject(input.projectId, 'submission:new', { id: sub.id });
  // enqueue AI-02 extraction (background, 3 retries exponential)
  await aiExtractionQueue.add('extract', { submissionId: sub.id });
  res.status(201).json({ data: sub });
}

export async function listSubmissions(req: AuthedRequest, res: Response) {
  const projectId = req.query.projectId as string;
  if (!projectId) return res.status(400).json({ error: 'BadRequest', message: 'projectId required' });
  if (!(await assertProjectAccess(req.userId!, projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  const { page, limit, skip, take } = paginate(req.query);
  const [total, data] = await Promise.all([
    prisma.submission.count({ where: { projectId } }),
    prisma.submission.findMany({ where: { projectId }, skip, take, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json(paged(data, total, page, limit));
}

export async function getSubmission(req: AuthedRequest, res: Response) {
  const sub = await prisma.submission.findUnique({ where: { id: req.params.id } });
  if (!sub) return res.status(404).json({ error: 'NotFound', message: 'Not found' });
  if (!(await assertProjectAccess(req.userId!, sub.projectId))) return res.status(403).json({ error: 'Forbidden', message: 'Denied' });
  res.json({ data: sub });
}
