import { Job } from "bullmq";
import { deliverEmail, EmailJob } from "../../services/mailer";
import { prisma } from "../../lib/prisma";

export async function processEmail(job: Job<EmailJob>) {
  await deliverEmail(job.data);
  // Stamp emailedAt on the recipient's recent un-emailed notifications.
  const user = await prisma.user.findUnique({ where: { email: job.data.to.toLowerCase() }, select: { id: true } }).catch(() => null);
  if (user) {
    await prisma.notification.updateMany({
      where: { userId: user.id, emailedAt: null, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
      data: { emailedAt: new Date() },
    }).catch(() => undefined);
  }
}
