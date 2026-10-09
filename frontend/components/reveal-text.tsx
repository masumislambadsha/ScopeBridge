"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

export function RevealText({
  pre = "",
  accent = "",
  post = "",
  className = "",
  delay = 0,
}: {
  pre?: string;
  accent?: string;
  post?: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });
  const words = (pre + " ").split(" ").filter(Boolean);
  const accentWords = accent.split(" ").filter(Boolean);
  const postWords = (post ? " " + post : "").split(" ").filter(Boolean);
  const all: { word: string; isAccent: boolean }[] = [
    ...words.map((w) => ({ word: w, isAccent: false })),
    ...accentWords.map((w) => ({ word: w, isAccent: true })),
    ...postWords.map((w) => ({ word: w, isAccent: false })),
  ];
  return (
    <span ref={ref} className={cn("block", className)}>
      {all.map(({ word, isAccent }, i) => (
        <span key={i} className="inline-block overflow-hidden align-top pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className={cn("inline-block", isAccent && "italic text-sage-600")}
            initial={{ y: "112%" }}
            animate={inView ? { y: 0 } : { y: "112%" }}
            transition={{ duration: 0.7, delay: delay + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}
