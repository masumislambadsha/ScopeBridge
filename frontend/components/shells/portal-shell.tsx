"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api.get("/api/notifications?limit=1").then((r) => (r.meta?.unreadCount ?? 0) as number),
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
          <Link href="/portal" className="font-bold">
            ScopeBridge <span className="font-normal text-zinc-500">Client Portal</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 text-sm sm:flex">
            <Link href="/portal" className={`rounded-md px-3 py-2 ${pathname === "/portal" ? "bg-zinc-100 font-medium" : "text-zinc-600 hover:bg-zinc-50"}`}>
              Projects
            </Link>
            <Link href="/portal/notifications" className={`rounded-md px-3 py-2 ${pathname.startsWith("/portal/notifications") ? "bg-zinc-100 font-medium" : "text-zinc-600 hover:bg-zinc-50"}`}>
              Notifications
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {session && session.memberships.length > 0 && (
              <Link href="/dashboard" className="rounded-md border px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50">
                Agency view
              </Link>
            )}
            <Link href="/portal/notifications" aria-label="Notifications" className="relative rounded-md p-2 hover:bg-zinc-100">
              <Bell size={18} />
              {!!unread && unread > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">{unread}</span>}
            </Link>
            <span className="hidden text-sm text-zinc-600 sm:inline">{session?.user.name}</span>
            <Button variant="ghost" size="icon" aria-label="Logout" onClick={() => void logout()}>
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-3 sm:p-6">{children}</main>
    </div>
  );
}
