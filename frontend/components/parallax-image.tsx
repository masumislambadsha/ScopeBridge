"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function ParallaxImage({
  src,
  alt,
  className,
  imgClassName,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const progress = Math.min(Math.max((window.innerHeight - r.top) / (window.innerHeight + r.height), 0), 1);
        el.style.setProperty("--parallax", `${(progress - 0.5) * 20}%`);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn("h-full w-full scale-[1.2] object-cover", imgClassName)}
        style={{ transform: "translateY(var(--parallax, 0%)) scale(1.2)" }}
      />
    </div>
  );
}
