'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

type User = { id: string; name: string; email: string };
const Ctx = createContext<{ user: User | null; login: (email: string, password: string) => Promise<void>; register: (name: string, email: string, password: string) => Promise<void>; logout: () => Promise<void> }>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  useEffect(() => {
    const raw = localStorage.getItem('sb_user');
    if (raw) { try { setUser(JSON.parse(raw)); } catch {} }
  }, []);
  async function login(email: string, password: string) {
    const j = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('sb_access', j.data.accessToken);
    const u = { id: j.data.id, name: j.data.name, email: j.data.email };
    localStorage.setItem('sb_user', JSON.stringify(u));
    setUser(u);
    router.push('/dashboard');
  }
  async function register(name: string, email: string, password: string) {
    const j = await api.post('/api/auth/register', { name, email, password });
    localStorage.setItem('sb_access', j.data.accessToken);
    const u = { id: j.data.id, name: j.data.name, email: j.data.email };
    localStorage.setItem('sb_user', JSON.stringify(u));
    setUser(u);
    router.push('/dashboard');
  }
  async function logout() {
    try { await api.post('/api/auth/logout', {}); } catch {}
    localStorage.removeItem('sb_access'); localStorage.removeItem('sb_user');
    setUser(null); router.push('/login');
  }
  return <Ctx.Provider value={{ user, login, register, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
