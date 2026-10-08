import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthPayload { sub: string; email: string; }
export interface AuthedRequest extends Request { userId?: string; userEmail?: string; }

export function signAccessToken(sub: string, email: string) {
  return jwt.sign({ sub, email }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized', message: 'Missing bearer token' });
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as AuthPayload & { sub: string };
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired access token' });
  }
}
