"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SpotlightCard({
  children,
  className = "",
  glow = "rgba(74,124,116,0.12)",
  size = 260,
}: {
  children: ReactNode;
  className?: string;
  glow?: string;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - rect.left}px`);
        el.style.setProperty("--y", `${e.clientY - rect.top}px`);
      }}
      className={cn("group relative overflow-hidden", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(${size}px circle at var(--x, 50%) var(--y, 50%), ${glow}, transparent 65%)` }}
      />
      {children}
    </div>
  );
}
