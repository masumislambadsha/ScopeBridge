import { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { redis, refreshKey } from '../lib/redis';
import { env } from '../config/env';
import { signAccessToken } from '../middleware/auth';

export const registerSchema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8) });
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

function signRefresh(sub: string) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub, jti }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { jti, token };
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true, secure: env.isProd, sameSite: env.isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 3600 * 1000, path: '/api/auth',
  });
}

export async function register(req: Request, res: Response) {
  const { name, email, password } = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Conflict', message: 'Email already registered' });
  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });
  const access = signAccessToken(user.id, user.email);
  const { jti, token } = signRefresh(user.id);
  await redis.set(refreshKey(jti), user.id, 'EX', 7 * 24 * 3600);
  setRefreshCookie(res, token);
  res.status(201).json({ data: { id: user.id, name, email, accessToken: access } });
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await argon2.verify(user.passwordHash, password)))
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
  const access = signAccessToken(user.id, user.email);
  const { jti, token } = signRefresh(user.id);
  await redis.set(refreshKey(jti), user.id, 'EX', 7 * 24 * 3600);
  setRefreshCookie(res, token);
  res.json({ data: { id: user.id, name: user.name, email, accessToken: access } });
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.refreshToken as string | undefined;
  if (token) {
    try {
      const p = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
      await redis.del(refreshKey(p.jti));
    } catch { /* ignore */ }
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ data: { ok: true } });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) return res.status(401).json({ error: 'Unauthorized', message: 'Missing refresh token' });
  try {
    const p = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
    const stored = await redis.get(refreshKey(p.jti));
    if (!stored || stored !== p.sub) return res.status(401).json({ error: 'Unauthorized', message: 'Invalid refresh token' });
    // rotation
    await redis.del(refreshKey(p.jti));
    const user = await prisma.user.findUnique({ where: { id: p.sub } });
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
    const access = signAccessToken(user.id, user.email);
    const fresh = signRefresh(user.id);
    await redis.set(refreshKey(fresh.jti), user.id, 'EX', 7 * 24 * 3600);
    setRefreshCookie(res, fresh.token);
    res.json({ data: { accessToken: access } });
  } catch {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid refresh token' });
  }
}

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });

export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  // always return ok to avoid enumeration
  if (user) {
    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 3600 * 1000) },
    });
    // In production send email; for now log. Never expose token in prod response.
    console.log(`[password-reset] user=${email} token=${raw}`);
    if (!env.isProd) return res.json({ data: { ok: true, resetToken: raw } });
  }
  res.json({ data: { ok: true } });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetSchema.parse(req.body);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.expiresAt < new Date()) return res.status(400).json({ error: 'BadRequest', message: 'Invalid or expired token' });
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await argon2.hash(password) } }),
    prisma.passwordResetToken.delete({ where: { id: row.id } }),
  ]);
  res.json({ data: { ok: true } });
}
