"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "scopebridge-theme";

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "light", toggle: () => {}, set: () => {} });

export function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", t === "dark");
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
}

export function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let initial: Theme = "light";
    try {
      const saved = localStorage.getItem(KEY) as Theme | null;
      if (saved === "light" || saved === "dark") initial = saved;
    } catch {
      /* ignore */
    }
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const set = useCallback((t: Theme) => {
    setTheme(t);
    applyTheme(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ theme, toggle, set }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
