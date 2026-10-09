"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setAccessToken } from "./api";

export interface Membership {
  workspaceId: string;
  workspaceName: string;
  role: "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER";
}
export interface PortalProject {
  id: string;
  name: string;
  status: string;
}
export interface PortalClient {
  id: string;
  name: string;
  company: string | null;
  workspaceId: string;
  projects: PortalProject[];
}
export interface SessionUser {
  id: string;
  name: string;
  email: string;
}
interface Session {
  user: SessionUser;
  memberships: Membership[];
  portalAccess: PortalClient[];
  isClientOnly: boolean;
}

interface AuthCtx {
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string, inviteToken?: string) => Promise<void>;
  register: (name: string, email: string, password: string, inviteToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

function landingFor(s: Session): string {
  if (s.isClientOnly) return "/portal";
  return "/dashboard";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const reload = useCallback(async () => {
    try {
      const j = await api.get<Session>("/api/auth/me");
      setSession(j.data);
    } catch {
      setSession(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore session on app load via refresh (first-party cookie, §3.3).
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
        if (r.ok) {
          const j = await r.json().catch(() => null);
          if (j?.data?.accessToken) setAccessToken(j.data.accessToken as string);
        }
      } catch {
        /* no session */
      }
      await reload();
    })();
  }, [reload]);

  async function login(email: string, password: string, inviteToken?: string) {
    const j = await api.post<{ accessToken: string }>("/api/auth/login", { email, password, inviteToken });
    setAccessToken(j.data.accessToken);
    const me = await api.get<Session>("/api/auth/me");
    setSession(me.data);
    router.push(landingFor(me.data));
  }

  async function register(name: string, email: string, password: string, inviteToken?: string) {
    const j = await api.post<{ accessToken: string }>("/api/auth/register", { name, email, password, inviteToken });
    setAccessToken(j.data.accessToken);
    const me = await api.get<Session>("/api/auth/me");
    setSession(me.data);
    router.push(landingFor(me.data));
  }

  async function logout() {
    try {
      await api.post("/api/auth/logout", {});
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setSession(null);
    router.push("/login");
  }

  return <Ctx.Provider value={{ session, loading, login, register, logout, reload }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
