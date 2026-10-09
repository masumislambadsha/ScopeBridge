"use client";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function TiltCard({
  children,
  max = 6,
  className,
}: {
  children: React.ReactNode;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ rx: 0, ry: 0 });

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{ perspective: 1000 }}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        setT({ rx: -py * max * 2, ry: px * max * 2 });
      }}
      onMouseLeave={() => setT({ rx: 0, ry: 0 })}
    >
      <div
        style={{
          transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg)`,
          transition: "transform 0.3s ease-out",
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </div>
    </div>
  );
}
