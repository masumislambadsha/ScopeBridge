import { cn } from "@/lib/utils";

export function Marquee({
  children,
  duration = "40s",
  className,
  pauseOnHover = true,
}: {
  children: React.ReactNode;
  duration?: string;
  className?: string;
  pauseOnHover?: boolean;
}) {
  return (
    <div className={cn("overflow-hidden", pauseOnHover && "marquee-paused", className)} style={{ ["--duration" as string]: duration }}>
      <div className="marquee-track">
        {children}
        {children}
      </div>
    </div>
  );
}
