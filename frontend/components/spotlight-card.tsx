"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export function SpotlightCard({
  children,
  className,
  glow = "rgba(74,124,116,0.12)",
  size = 260,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: string;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className={cn("spotlight-card", className)}
      style={{ ["--spot-glow" as string]: glow, ["--spot-size" as string]: `${size}px` }}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - r.left}px`);
        el.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}
