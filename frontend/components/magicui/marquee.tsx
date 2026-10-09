import { type ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  className?: string
  reverse?: boolean
  pauseOnHover?: boolean
  children: React.ReactNode
  vertical?: boolean
  repeat?: number
  duration?: string
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  duration,
  style,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      style={{ ["--duration" as string]: duration, ...style }}
      className={cn(
        "group flex overflow-hidden p-2",
        vertical ? "flex-col" : "flex-row",
        className
      )}
    >
      {Array(repeat).fill(0).map((_, i) => (
        <div
          key={i}
          aria-hidden={i > 0}
          style={{ gap: "var(--gap, 2rem)" }}
          className={cn(
            "flex shrink-0 justify-around",
            !vertical && "animate-marquee flex-row",
            vertical && "animate-marquee-vertical flex-col",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
            reverse && "[animation-direction:reverse]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
