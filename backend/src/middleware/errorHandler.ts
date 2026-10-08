import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err?.status ?? err?.statusCode ?? 500;
  const message = status === 500 ? 'Internal server error' : (err?.message ?? 'Request failed');
  if (!env.isProd) console.error(err);
  res.status(status).json({ error: err?.name ?? 'Error', message });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'NotFound', message: 'Route not found' });
}
