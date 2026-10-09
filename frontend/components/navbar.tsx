"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HeartHandshake, Menu, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#portal", label: "Client portal" },
  { href: "/#pricing", label: "Pricing" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { session } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cta = session ? (session.isClientOnly ? "/portal" : "/dashboard") : "/register";

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4">
        <nav
          className={cn(
            "flex w-full max-w-shell items-center gap-2 transition-all duration-300",
            scrolled ? "mt-3 h-16 rounded-full border border-warm-200/70 bg-white/85 px-4 shadow-lg backdrop-blur-2xl dark:bg-[#131110]/85" : "h-20 bg-transparent px-2",
          )}
        >
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sage-600 to-teal-600 text-white">
              <HeartHandshake size={20} />
            </span>
            <span className="font-serif text-2xl text-ink dark:text-warm-50">ScopeBridge</span>
          </Link>

          <div className="ml-6 hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  pathname === l.href ? "bg-sage-100 text-sage-700" : "text-warm-700 hover:bg-sage-50 hover:text-sage-700 dark:text-warm-300",
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            {session ? (
              <Link href={cta} className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-warm-50 transition-transform hover:scale-[1.02] active:scale-[0.98] dark:bg-warm-50 dark:text-ink">
                Open app
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-full px-4 py-2.5 text-sm font-medium text-warm-700 hover:text-sage-700 dark:text-warm-300">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-warm-50 transition-transform hover:scale-[1.02] active:scale-[0.98] dark:bg-warm-50 dark:text-ink"
                >
                  <Sparkles size={15} /> Get started
                </Link>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            <button aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)} className="rounded-full border border-warm-200 p-2.5">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 bg-warm-50/95 backdrop-blur-2xl dark:bg-warm-950/95 lg:hidden">
          <div className="flex h-full flex-col gap-2 px-8 pt-28">
            {[["01", "How it works", "/#how"], ["02", "Features", "/#features"], ["03", "Client portal", "/#portal"], ["04", "Pricing", "/#pricing"]].map(
              ([n, label, href]) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-baseline gap-4 border-b border-warm-200/60 py-4">
                  <span className="text-sm text-warm-400">{n}</span>
                  <span className="font-serif text-2xl text-ink dark:text-warm-50">{label}</span>
                </Link>
              ),
            )}
            <Link
              href={cta}
              onClick={() => setOpen(false)}
              className="mt-8 rounded-full bg-ink px-6 py-3.5 text-center font-semibold text-warm-50 dark:bg-warm-50 dark:text-ink"
            >
              {session ? "Open app" : "Get started"}
            </Link>
            {!session && (
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-full border border-warm-200 px-6 py-3.5 text-center font-medium">
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
