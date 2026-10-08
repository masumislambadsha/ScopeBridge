'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

const Ctx = createContext<{ socket: Socket | null; events: Array<{ e: string; d: any }> }>({ socket: null, events: [] });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [events, setEvents] = useState<Array<{ e: string; d: any }>>([]);
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000', { auth: { token } });
    const all = ['submission:new','ai:extraction:done','ai:extraction:failed','ai:scope:ready','approval:requested','scope:approved','scope:rejected','task:assigned','tasks:created','task:updated','change-request:new','change-request:analyzed','change-request:decided','notification:new','message:new'];
    all.forEach((e) => s.on(e, (d: any) => setEvents((prev) => [{ e, d }, ...prev].slice(0, 50))));
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);
  return <Ctx.Provider value={{ socket, events }}>{children}</Ctx.Provider>;
}
export const useSocket = () => useContext(Ctx);
