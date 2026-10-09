import { cn } from "@/lib/utils";

export function Eyebrow({ children, dark = false, className }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em]",
        dark ? "text-sage-300" : "text-sage-500",
        className,
      )}
    >
      <span aria-hidden className={cn("h-px w-8", dark ? "bg-sage-300" : "bg-sage-500")} />
      {children}
      <span aria-hidden className={cn("h-px w-8", dark ? "bg-sage-300" : "bg-sage-500")} />
    </p>
  );
}
