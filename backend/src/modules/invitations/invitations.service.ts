import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError, conflict, forbidden, notFound } from "../../core/http";
import { audit } from "../../services/audit";
import { queueEmail } from "../../services/mailer";
import { notifyUser } from "../../services/notify";

const INVITE_TTL_MS = 7 * 24 * 3600 * 1000;

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function inviteLink(raw: string) {
  return `${env.frontendOrigins[0] ?? "http://localhost:3000"}/invite/${raw}`;
}

/** Admin invites a member or a client-portal user. Returns the invite + link (link also emailed). */
export async function createInvitation(
  actorId: string,
  workspaceId: string,
  input: { email: string; type: "MEMBER" | "CLIENT_PORTAL"; role?: "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER"; clientId?: string },
) {
  const email = input.email.toLowerCase();
  if (input.type === "CLIENT_PORTAL") {
    const client = await prisma.client.findUnique({ where: { id: input.clientId! } });
    if (!client || client.workspaceId !== workspaceId) throw notFound("Client not found");
    if (client.portalUserId) throw conflict("Client already has portal access");
  } else {
    const existingMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId, user: { email } },
    });
    if (existingMember) throw conflict("User is already a workspace member");
  }
  const raw = crypto.randomBytes(32).toString("hex");
  const inv = await prisma.invitation.create({
    data: {
      workspaceId, type: input.type as never, email,
      role: input.type === "MEMBER" ? (input.role as never) : null,
      clientId: input.type === "CLIENT_PORTAL" ? input.clientId! : null,
      tokenHash: hashToken(raw), invitedById: actorId,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
  const inviter = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
  if (input.type === "MEMBER") {
    await queueEmail(email, "invitation", { token: raw, workspaceName: ws?.name ?? "", role: input.role ?? "", inviterName: inviter?.name ?? "" });
  } else {
    const client = await prisma.client.findUnique({ where: { id: input.clientId! }, select: { name: true } });
    await queueEmail(email, "portal-invite", { token: raw, workspaceName: ws?.name ?? "", clientName: client?.name ?? "" });
  }
  await audit({ workspaceId, actorId, action: "member.invited", entityType: "Invitation", entityId: inv.id, metadata: { email, type: input.type } });
  return { invitation: inv, link: inviteLink(raw) };
}

export async function previewInvitation(raw: string) {
  const inv = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { workspace: { select: { id: true, name: true } }, client: { select: { id: true, name: true } } },
  });
  if (!inv || inv.revokedAt || inv.acceptedAt || inv.expiresAt < new Date()) {
    throw new AppError("VALIDATION_ERROR", "Invitation is invalid or expired");
  }
  return { type: inv.type, email: inv.email, role: inv.role, workspace: inv.workspace, client: inv.client };
}

/** Accept an invitation for a user (called after register/login, or directly when logged in). */
export async function acceptInvitationForUser(userId: string, email: string, raw: string) {
  const inv = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!inv || inv.revokedAt || inv.acceptedAt || inv.expiresAt < new Date()) {
    throw new AppError("VALIDATION_ERROR", "Invitation is invalid or expired");
  }
  if (inv.email.toLowerCase() !== email.toLowerCase()) {
    throw forbidden("This invitation was sent to a different email address");
  }
  if (inv.type === "MEMBER") {
    await prisma.$transaction([
      prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: inv.workspaceId, userId } },
        update: {},
        create: { workspaceId: inv.workspaceId, userId, role: inv.role ?? "TEAM_MEMBER" },
      }),
      prisma.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } }),
    ]);
    await audit({ workspaceId: inv.workspaceId, actorId: userId, action: "member.joined", entityType: "WorkspaceMember", entityId: inv.workspaceId });
    await notifyUser(userId, { type: "INVITE_ACCEPTED", title: "You joined a workspace", entityId: inv.workspaceId, entityType: "Workspace" });
  } else {
    await prisma.$transaction([
      prisma.client.update({ where: { id: inv.clientId! }, data: { portalUserId: userId } }),
      prisma.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } }),
    ]);
    await audit({ workspaceId: inv.workspaceId, actorId: userId, action: "client.portal_linked", entityType: "Client", entityId: inv.clientId! });
  }
  return { ok: true, workspaceId: inv.workspaceId };
}

export async function listInvitations(workspaceId: string) {
  return prisma.invitation.findMany({
    where: { workspaceId, acceptedAt: null, revokedAt: null },
    orderBy: { createdAt: "desc" },
    include: { invitedBy: { select: { id: true, name: true } } },
  });
}

export async function revokeInvitation(workspaceId: string, actorId: string, id: string) {
  const inv = await prisma.invitation.findUnique({ where: { id } });
  if (!inv || inv.workspaceId !== workspaceId) throw notFound("Invitation not found");
  await prisma.invitation.update({ where: { id }, data: { revokedAt: new Date() } });
  await audit({ workspaceId, actorId, action: "member.invite_revoked", entityType: "Invitation", entityId: id });
  return { ok: true };
}
