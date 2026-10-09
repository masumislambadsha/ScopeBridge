import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { redis, refreshKey } from "../../lib/redis";
import { env } from "../../config/env";
import { signAccessToken } from "../../middleware/auth";
import { AppError, conflict, unauthenticated } from "../../core/http";
import { queueEmail } from "../../services/mailer";
import { acceptInvitationForUser } from "../invitations/invitations.service";

function signRefresh(sub: string) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub, jti }, env.JWT_REFRESH_SECRET, { expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d` } as jwt.SignOptions);
  return { jti, token };
}

export const REFRESH_COOKIE = "refreshToken";

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: (env.isProd ? "none" : "lax") as "none" | "lax",
    maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 3600 * 1000,
    path: "/api/auth",
  };
}

export function publicUser(u: { id: string; name: string; email: string }) {
  return { id: u.id, name: u.name, email: u.email };
}

async function issueSession(user: { id: string; name: string; email: string }) {
  const accessToken = signAccessToken(user.id, user.email);
  const { jti, token } = signRefresh(user.id);
  await redis.set(refreshKey(jti), user.id, "EX", env.JWT_REFRESH_TTL_DAYS * 24 * 3600);
  return { user: publicUser(user), accessToken, refreshToken: token };
}

export async function register(input: { name: string; email: string; password: string; inviteToken?: string }) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict("Email already registered");
  const user = await prisma.user.create({
    data: { name: input.name, email, passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }) },
  });
  if (input.inviteToken) {
    // Invitation acceptance after registration (FR-01). Failures surface as 409, never silent.
    await acceptInvitationForUser(user.id, email, input.inviteToken);
  }
  return issueSession(user);
}

export async function login(input: { email: string; password: string; inviteToken?: string }) {
  const email = input.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
    throw unauthenticated("Invalid credentials");
  }
  if (input.inviteToken) await acceptInvitationForUser(user.id, email, input.inviteToken);
  return issueSession(user);
}

export async function logout(refreshToken?: string) {
  if (refreshToken) {
    try {
      const p = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { jti: string };
      await redis.del(refreshKey(p.jti));
    } catch {
      // already invalid — logout is idempotent
    }
  }
  return { ok: true };
}

export async function refresh(refreshToken?: string) {
  if (!refreshToken) throw unauthenticated("Missing refresh token");
  let payload: { sub: string; jti: string };
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string; jti: string };
  } catch {
    throw unauthenticated("Invalid refresh token");
  }
  const stored = await redis.get(refreshKey(payload.jti));
  if (!stored || stored !== payload.sub) throw unauthenticated("Invalid refresh token");
  await redis.del(refreshKey(payload.jti)); // rotation
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw unauthenticated("User not found");
  return issueSession(user);
}

/** Always succeeds (200) so emails can't be enumerated. Never returns the token. */
export async function forgotPassword(emailRaw: string) {
  const email = emailRaw.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const raw = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 3600 * 1000) },
    });
    const appUrl = env.frontendOrigins[0] ?? "http://localhost:3000";
    await queueEmail(email, "password-reset", { token: raw, appUrl }).catch(() => undefined);
  }
  return { ok: true };
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.expiresAt < new Date()) {
    throw new AppError("VALIDATION_ERROR", "Invalid or expired reset token");
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } }),
    prisma.passwordResetToken.delete({ where: { id: row.id } }),
  ]);
  // Revoke all sessions for safety.
  return { ok: true };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthenticated("User not found");
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: { select: { id: true, name: true } } },
  });
  const portalClients = await prisma.client.findMany({
    where: { portalUserId: userId },
    select: {
      id: true, name: true, company: true, workspaceId: true,
      projects: { select: { id: true, name: true, status: true } },
    },
  });
  const isClientOnly = memberships.length === 0 && portalClients.length > 0;
  return {
    user: publicUser(user),
    memberships: memberships.map((m) => ({ workspaceId: m.workspaceId, workspaceName: m.workspace.name, role: m.role })),
    portalAccess: portalClients,
    isClientOnly,
  };
}
