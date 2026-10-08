import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import apiRoutes from './routes/api.routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { swaggerSpec } from './lib/swagger';

export function buildApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use(cors({ origin: env.FRONTEND_URL.split(','), credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api/auth', authRoutes);
  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
