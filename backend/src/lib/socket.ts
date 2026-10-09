import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import IORedis from "ioredis";
import { env } from "../config/env";
import { logger } from "../core/logger";
import { getProjectAccess } from "../middleware/access";
import { userRoom, teamRoom, clientRoom, EVENT_BUS_CHANNEL, BusEvent } from "../services/realtime";

let io: Server | null = null;

export function getIO(): Server | null {
  return io;
}

export function initSocket(httpServer: unknown) {
  io = new Server(httpServer as never, {
    cors: { origin: env.frontendOrigins, credentials: true },
  });

  io.use((socket, next) => {
    const token = (socket.handshake.auth?.token as string) ?? "";
    if (!token) return next(new Error("Missing token"));
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
      (socket as Socket & { userId: string }).userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as Socket & { userId: string }).userId;
    void socket.join(userRoom(userId));

    // Access-checked room join (§2.2 D05): team room for agency, client room for portal users.
    socket.on("project:join", async (projectId: unknown) => {
      if (typeof projectId !== "string") return;
      const access = await getProjectAccess(userId, projectId).catch(() => null);
      if (!access) {
        socket.emit("project:join:denied", { projectId });
        return;
      }
      if (access.kind === "MEMBER") await socket.join(teamRoom(projectId));
      else await socket.join(clientRoom(projectId));
      socket.emit("project:join:ok", { projectId });
    });

    socket.on("project:leave", async (projectId: unknown) => {
      if (typeof projectId !== "string") return;
      await socket.leave(teamRoom(projectId));
      await socket.leave(clientRoom(projectId));
    });
  });

  // D-10: subscribe to the Redis event bus so worker-published events reach browsers.
  const sub = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });
  sub.on("error", (e) => logger.error("[socket] bus error", { err: String(e) }));
  void sub.subscribe(EVENT_BUS_CHANNEL).catch((e) => logger.error("[socket] bus subscribe failed", { err: String(e) }));
  sub.on("message", (_channel, raw) => {
    try {
      const msg = JSON.parse(raw) as BusEvent;
      io?.to(msg.room).emit(msg.event, msg.payload);
    } catch (e) {
      logger.error("[socket] bad bus message", { err: String(e) });
    }
  });

  return io;
}
