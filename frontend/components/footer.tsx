"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ArrowUp, HeartHandshake } from "lucide-react";

export function Footer({ variant = "full" }: { variant?: "full" | "simple" }) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (variant === "simple") {
    return (
      <footer className="border-t border-warm-200/70 py-8 text-center text-sm text-warm-500">
        <p>© {new Date().getFullYear()} ScopeBridge — scope your work, protect your revenue.</p>
      </footer>
    );
  }

  return (
    <footer className="relative overflow-hidden bg-ink text-warm-300">
      <div className="bg-dot-pattern absolute inset-0 opacity-[0.04]" aria-hidden />
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-sage-600/20 blur-[160px]" aria-hidden />
      <div className="relative mx-auto grid max-w-shell gap-10 px-6 py-16 md:px-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sage-600 to-teal-600 text-white">
              <HeartHandshake size={20} />
            </span>
            <span className="font-serif text-2xl text-warm-50">ScopeBridge</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Client input → requirements → approved scope → tasks → change requests. One traceable chain that ends scope creep.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {["SOC2-ready audit log", "AI-assisted intake", "Client portal"].map((t) => (
              <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
          {[
            ["Product", [["How it works", "/#how"], ["Features", "/#features"], ["Client portal", "/#portal"], ["Pricing", "/#pricing"]]],
            ["App", [["Dashboard", "/dashboard"], ["Projects", "/projects"], ["Client portal", "/portal"], ["Login", "/login"]]],
            ["Support", [["Register", "/register"], ["Client login", "/portal/login"], ["Notifications", "/notifications"], ["Activity", "/activity"]]],
          ].map(([title, links]) => (
            <div key={title as string}>
              <p className="font-serif text-lg text-warm-50">{title as string}</p>
              <ul className="mt-3 grid gap-2 text-sm">
                {(links as [string, string][]).map(([label, href]) => (
                  <li key={href + label}>
                    <Link href={href} className="transition-colors hover:text-warm-50">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="lg:col-span-3">
          <p className="font-serif text-lg text-warm-50">Stay in scope</p>
          <p className="mt-2 text-sm">Product notes for agencies. No spam.</p>
          <form className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5 pl-4" onSubmit={(e) => e.preventDefault()}>
            <input aria-label="Email" placeholder="you@agency.com" className="w-full bg-transparent text-sm text-warm-50 placeholder:text-warm-500 focus:outline-none" />
            <button aria-label="Subscribe" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white transition-transform hover:scale-105">
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-shell flex-wrap items-center gap-3 px-6 py-5 text-xs md:px-10">
          <p>© {new Date().getFullYear()} ScopeBridge. All rights reserved.</p>
          <span className="ml-auto">Built for agencies that hate scope creep.</span>
        </div>
      </div>

      <AnimatePresence>
        {showTop && (
          <motion.button
            key="back-to-top"
            aria-label="Back to top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-warm-50 text-ink shadow-xl transition-transform hover:scale-105"
          >
            <ArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </footer>
  );
}
