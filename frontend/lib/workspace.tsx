"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth";

const KEY = "sb_workspace";

const Ctx = createContext<{ workspaceId: string | null; setWorkspaceId: (id: string) => void }>({
  workspaceId: null,
  setWorkspaceId: () => undefined,
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setWorkspaceId(null);
      return;
    }
    const saved = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    const ids = session.memberships.map((m) => m.workspaceId);
    if (saved && ids.includes(saved)) setWorkspaceId(saved);
    else if (ids.length) {
      setWorkspaceId(ids[0]);
      localStorage.setItem(KEY, ids[0]);
    } else setWorkspaceId(null);
  }, [session]);

  function select(id: string) {
    setWorkspaceId(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* ignore */
    }
  }

  return <Ctx.Provider value={{ workspaceId, setWorkspaceId: select }}>{children}</Ctx.Provider>;
}

export const useWorkspace = () => useContext(Ctx);
