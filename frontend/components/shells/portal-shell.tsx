"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell, HeartHandshake, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api.get("/api/notifications?limit=1").then((r) => (r.meta?.unreadCount ?? 0) as number),
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-warm-950">
      <header className="sticky top-0 z-40 flex justify-center px-4">
        <div className="mt-3 flex h-16 w-full max-w-shell items-center gap-2 rounded-full border border-warm-200/70 bg-white/85 px-4 shadow-lg backdrop-blur-2xl dark:bg-[#131110]/85">
          <Link href="/portal" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sage-600 to-teal-600 text-white">
              <HeartHandshake size={20} />
            </span>
            <span className="font-serif text-xl">
              ScopeBridge <span className="font-sans text-sm font-medium text-warm-500">Client Portal</span>
            </span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 text-sm sm:flex">
            {[
              ["/portal", "Projects"],
              ["/portal/notifications", "Notifications"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-full px-4 py-2 font-medium transition-colors",
                  pathname === href ? "bg-sage-100 text-sage-700" : "text-warm-600 hover:bg-sage-50 hover:text-sage-700",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {session && session.memberships.length > 0 && (
              <Link href="/dashboard" className="hidden rounded-full border border-warm-200 px-4 py-2 text-sm font-medium hover:bg-sage-50 sm:inline">
                Agency view
              </Link>
            )}
            <ThemeToggle />
            <Link href="/portal/notifications" aria-label="Notifications" className="relative rounded-xl p-2 hover:bg-sage-50">
              <Bell size={18} />
              {!!unread && unread > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span>}
            </Link>
            <span className="hidden text-sm font-medium text-warm-700 sm:inline dark:text-warm-300">{session?.user.name}</span>
            <button aria-label="Logout" onClick={() => void logout()} className="rounded-xl p-2 hover:bg-sage-50">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-shell p-4 pt-6 sm:p-8">{children}</main>
    </div>
  );
}
