import { redis } from "../lib/redis";
import { logger } from "../core/logger";

export const EVENT_BUS_CHANNEL = "sb:events";

export interface BusEvent {
  room: string;
  event: string;
  payload: unknown;
}

export const userRoom = (userId: string) => `user:${userId}`;
export const teamRoom = (projectId: string) => `project:${projectId}:team`;
export const clientRoom = (projectId: string) => `project:${projectId}:client`;

/** Publish a realtime event. Works from API and worker (D-10: no redis-emitter needed). */
export async function publishEvent(room: string, event: string, payload: unknown): Promise<void> {
  try {
    await redis.publish(EVENT_BUS_CHANNEL, JSON.stringify({ room, event, payload } satisfies BusEvent));
  } catch (err) {
    logger.error("event bus publish failed", { err: String(err) });
  }
}

export async function emitToUser(userId: string, event: string, payload: unknown) {
  await publishEvent(userRoom(userId), event, payload);
}

export async function emitTeam(projectId: string, event: string, payload: unknown) {
  await publishEvent(teamRoom(projectId), event, payload);
}

export async function emitClient(projectId: string, event: string, payload: unknown) {
  await publishEvent(clientRoom(projectId), event, payload);
}
