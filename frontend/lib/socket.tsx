"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "./api";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

/** Socket events → React Query cache invalidation (§3.5). */
const INVALIDATE: Record<string, string[][]> = {
  "notification:new": [["notifications"]],
  "message:new": [["messages"]],
  "ai:run:updated": [["ai-runs"], ["requirements"], ["readiness"], ["change-requests"]],
  "submission:new": [["submissions"], ["information-requests"]],
  "requirement:updated": [["requirements"], ["readiness"], ["traceability"]],
  "scope:version:updated": [["scope"], ["scope-versions"], ["traceability"]],
  "approval:updated": [["approvals"], ["scope"], ["scope-versions"], ["change-requests"], ["traceability"]],
  "task:updated": [["tasks"], ["my-tasks"], ["traceability"], ["dashboard"]],
  "change-request:updated": [["change-requests"], ["change-request"], ["traceability"]],
};

const Ctx = createContext<{ socket: Socket | null; joinedProject: string | null; joinProject: (id: string | null) => void }>({
  socket: null,
  joinedProject: null,
  joinProject: () => undefined,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [joinedProject, setJoinedProject] = useState<string | null>(null);
  const joinedRef = useRef<string | null>(null);
  const qc = useQueryClient();

  // (Re)connect whenever we have a token — after login, refresh, or reload.
  useEffect(() => {
    let s: Socket | null = null;
    let alive = true;
    const t = setInterval(() => {
      const token = getAccessToken();
      if (token && !s && alive) {
        s = io(SOCKET_URL, { auth: { token } });
        for (const ev of Object.keys(INVALIDATE)) {
          s.on(ev, () => {
            for (const key of INVALIDATE[ev]) void qc.invalidateQueries({ queryKey: key });
          });
        }
        if (joinedRef.current) s.emit("project:join", joinedRef.current);
        setSocket(s);
      } else if (!token && s) {
        s.disconnect();
        s = null;
        setSocket(null);
      }
    }, 1000);
    return () => {
      alive = false;
      clearInterval(t);
      s?.disconnect();
    };
  }, [qc]);

  function joinProject(id: string | null) {
    joinedRef.current = id;
    setJoinedProject(id);
    if (id) socket?.emit("project:join", id);
  }

  return <Ctx.Provider value={{ socket, joinedProject, joinProject }}>{children}</Ctx.Provider>;
}

export const useSocket = () => useContext(Ctx);
