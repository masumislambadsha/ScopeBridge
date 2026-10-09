import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({
  children,
  dark = false,
  className = "",
}: {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs tracking-[0.2em] uppercase font-medium mb-6 inline-flex items-center gap-3",
        dark ? "text-sage-300" : "text-sage-500",
        className,
      )}
    >
      <span className={cn("h-px w-8", dark ? "bg-sage-300/60" : "bg-sage-500/60")} />
      {children}
      <span className={cn("h-px w-8", dark ? "bg-sage-300/60" : "bg-sage-500/60")} />
    </p>
  );
}
