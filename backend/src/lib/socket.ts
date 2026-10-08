import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let io: Server | null = null;

export function initSocket(httpServer: any) {
  io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_URL.split(','), credentials: true },
  });
  io.use((socket, next) => {
    const token = (socket.handshake.auth?.token as string) ?? '';
    if (!token) return next(new Error('Missing token'));
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
      (socket as any).userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });
  io.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    socket.join(`user:${userId}`);
    socket.on('project:join', (projectId: string) => {
      if (typeof projectId === 'string') socket.join(`project:${projectId}`);
    });
    socket.on('project:leave', (projectId: string) => {
      if (typeof projectId === 'string') socket.leave(`project:${projectId}`);
    });
  });
  return io;
}

export function getIO(): Server | null { return io; }

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}
export function emitToProject(projectId: string, event: string, payload: unknown) {
  io?.to(`project:${projectId}`).emit(event, payload);
}
