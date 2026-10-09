"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RevealTextProps {
  pre?: string;
  accent?: string;
  post?: string;
  delay?: number;
  className?: string;
}

export function RevealText({ pre = "", accent = "", post = "", delay = 0, className }: RevealTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "-40px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const words = (t: string) => (t ? t.split(" ") : []);
  let i = 0;

  const render = (list: string[], accentWord = false) =>
    list.map((w) => {
      const idx = i++;
      return (
        <span key={idx} className="reveal-mask">
          <span className={cn("reveal-word", accentWord && "accent-word")} style={{ transitionDelay: `${delay + idx * 0.05}s` }}>
            {w}
            {`\u00A0`}
          </span>
        </span>
      );
    });

  return (
    <span ref={ref} className={cn(visible && "reveal-visible", className)}>
      {render(words(pre))}
      {render(words(accent), true)}
      {render(words(post))}
    </span>
  );
}
