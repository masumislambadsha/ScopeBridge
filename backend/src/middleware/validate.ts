import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const first = result.error.errors[0];
      return res.status(400).json({ error: 'ValidationError', message: first?.message ?? 'Invalid input', field: first?.path?.join('.') });
    }
    (req as any)[source] = result.data;
    next();
  };
