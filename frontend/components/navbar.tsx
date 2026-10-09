"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { HeartHandshake, LayoutDashboard, FolderKanban, Users, Settings, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import BurgerCheckbox from "@/components/burger-checkbox";

const navLinks = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#portal", label: "Client portal" },
  { href: "/#pricing", label: "Pricing" },
];

export default function Navbar() {
  const { session, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const cta = session ? (session.isClientOnly ? "/portal" : "/dashboard") : "/register";

  const initials = (session?.user?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <div
            className={[
              "flex items-center justify-between transition-all duration-500",
              scrolled
                ? "mt-3 h-16 px-4 sm:px-6 rounded-full bg-white/85 dark:bg-[#131110]/85 backdrop-blur-2xl border border-warm-200/70 dark:border-white/10 shadow-lg shadow-black/[0.05]"
                : "h-20",
            ].join(" ")}
          >
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sage-600 to-teal-600 flex items-center justify-center shadow-lg shadow-sage-600/20 group-hover:shadow-sage-600/40 group-hover:scale-105 transition-all duration-300">
                <HeartHandshake className="w-5 h-5 text-white" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-[#1a1a1a] dark:text-warm-50">
                ScopeBridge
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map(({ href, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={[
                      "relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300",
                      active
                        ? "text-sage-700 dark:text-sage-300"
                        : "text-warm-700 dark:text-warm-300 hover:text-[#1a1a1a] dark:hover:text-warm-50",
                    ].join(" ")}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-sage-100 dark:bg-white/10"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {session ? (
                <>
                  <ThemeToggle />
                  <Link
                    href={cta}
                    className="hidden md:inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold bg-[#1a1a1a] dark:bg-warm-50 text-warm-50 dark:text-[#1a1a1a] rounded-full shadow-lg shadow-black/10 dark:shadow-white/10 hover:bg-[#2a2a2a] dark:hover:bg-warm-100 transition-all duration-300 active:scale-[0.97]"
                  >
                    Open app
                    <Sparkles className="w-4 h-4 opacity-70" />
                  </Link>
                  <Link
                    href={cta}
                    aria-label="Open app"
                    className="flex md:hidden w-9 h-9 items-center justify-center rounded-full bg-sage-600 text-white text-xs font-bold"
                  >
                    {initials}
                  </Link>
                </>
              ) : (
                <div className="hidden md:flex items-center gap-2.5">
                  <ThemeToggle />
                  <Link
                    href="/login"
                    className="px-5 py-2.5 text-sm font-medium text-warm-700 dark:text-warm-300 hover:text-[#1a1a1a] dark:hover:text-warm-50 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="group relative inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold bg-[#1a1a1a] dark:bg-warm-50 text-warm-50 dark:text-[#1a1a1a] rounded-full shadow-lg shadow-black/10 dark:shadow-white/10 hover:bg-[#2a2a2a] dark:hover:bg-warm-100 transition-all duration-300 active:scale-[0.97]"
                  >
                    Get Started
                    <Sparkles className="w-4 h-4 opacity-70 group-hover:rotate-12 transition-transform" />
                  </Link>
                </div>
              )}

              <div className="lg:hidden flex items-center gap-2">
                {!session && (
                  <Link
                    href="/register"
                    className="inline-flex items-center px-4 py-2 text-sm font-semibold bg-[#1a1a1a] dark:bg-warm-50 text-warm-50 dark:text-[#1a1a1a] rounded-full"
                  >
                    Join
                  </Link>
                )}
                <BurgerCheckbox checked={mobileOpen} onChange={setMobileOpen} />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            className="lg:hidden fixed inset-x-0 top-0 h-dvh z-40 bg-warm-50/95 dark:bg-[#0f0e0c]/95 backdrop-blur-2xl flex flex-col px-6 pt-24 pb-10 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <div className="flex flex-col gap-1.5">
              {navLinks.map(({ href, label }, i) => {
                const active = isActive(href);
                return (
                  <motion.div
                    key={href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 + i * 0.07, ease: [0.22, 1, 0.36, 1], duration: 0.5 }}
                  >
                    <Link
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "flex items-center justify-between py-3.5 px-4 rounded-2xl font-serif text-2xl font-bold transition-colors",
                        active
                          ? "text-sage-600 dark:text-sage-400 bg-sage-100/70 dark:bg-white/5"
                          : "text-[#1a1a1a] dark:text-warm-50 hover:bg-warm-100 dark:hover:bg-white/5",
                      ].join(" ")}
                    >
                      {label}
                      <span className="text-sm font-sans text-warm-300/60">0{i + 1}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              className="mt-auto pt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, ease: [0.22, 1, 0.36, 1], duration: 0.5 }}
            >
              {session ? (
                <div className="rounded-3xl border border-warm-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="flex w-10 h-10 items-center justify-center rounded-full bg-sage-600 text-white text-sm font-bold">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1a1a1a] dark:text-warm-50 truncate">
                        {session.user?.name}
                      </p>
                      <p className="text-xs text-warm-700 dark:text-warm-300 truncate">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    {[
                      { href: session.isClientOnly ? "/portal" : "/dashboard", label: "Dashboard", icon: LayoutDashboard },
                      { href: "/projects", label: "Projects", icon: FolderKanban },
                      { href: "/clients", label: "Clients", icon: Users },
                      { href: "/settings/workspace", label: "Settings", icon: Settings },
                    ]
                      .filter((item) => session.isClientOnly ? item.href === "/portal" || item.href === "/projects" : true)
                      .map((item) => (
                        <Link
                          key={item.href + item.label}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-warm-700 dark:text-warm-300 hover:text-sage-600 dark:hover:text-sage-400 hover:bg-sage-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      ))}
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        void logout();
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>

                  <div className="mt-5 pt-5 border-t border-warm-200 dark:border-white/10 flex items-center justify-between">
                    <span className="text-xs text-warm-700 dark:text-warm-300">Appearance</span>
                    <ThemeToggle />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="py-3.5 text-center text-sm font-semibold text-[#1a1a1a] dark:text-warm-50 border border-warm-300 dark:border-white/15 rounded-full hover:bg-warm-100 dark:hover:bg-white/5 transition-all"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="py-3.5 text-center text-sm font-semibold bg-[#1a1a1a] dark:bg-warm-50 text-warm-50 dark:text-[#1a1a1a] rounded-full shadow-lg shadow-black/10 transition-all"
                  >
                    Get Started
                  </Link>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <span className="text-xs text-warm-700 dark:text-warm-300">Appearance</span>
                    <ThemeToggle />
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
