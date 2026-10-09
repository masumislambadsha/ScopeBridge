"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Menu, X, LayoutDashboard, FolderKanban, Users, Settings, CheckSquare, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/tasks", label: "My tasks", icon: CheckSquare },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings/members", label: "Team", icon: Users },
  { href: "/settings/workspace", label: "Settings", icon: Settings },
];

export function AgencyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useAuth();
  const { workspaceId, setWorkspaceId } = useWorkspace();
  const [open, setOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api.get<{ unreadCount?: number }>("/api/notifications?limit=1").then((r) => (r.meta?.unreadCount ?? 0) as number),
    refetchInterval: 30_000,
  });
  const unread = notifData ?? 0;

  const role = session?.memberships.find((m) => m.workspaceId === workspaceId)?.role;
  const items = NAV.filter((n) => {
    if (n.href.startsWith("/settings") && role !== "ADMIN") return false;
    return true;
  });

  const sidebar = (
    <div className="flex h-full flex-col gap-1 p-3">
      <Link href="/dashboard" className="mb-2 px-2 text-lg font-bold" onClick={() => setOpen(false)}>
        ScopeBridge
      </Link>
      {session && session.memberships.length > 0 && (
        <select
          aria-label="Workspace"
          className="mb-2 h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm"
          value={workspaceId ?? ""}
          onChange={(e) => {
            setWorkspaceId(e.target.value);
            router.push("/dashboard");
          }}
        >
          {session.memberships.map((m) => (
            <option key={m.workspaceId} value={m.workspaceId}>
              {m.workspaceName} ({m.role})
            </option>
          ))}
        </select>
      )}
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
            pathname === n.href || pathname.startsWith(n.href + "/")
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100",
          )}
        >
          <n.icon size={16} /> {n.label}
        </Link>
      ))}
      {session && session.portalAccess.length > 0 && (
        <Link href="/portal" className="mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100" onClick={() => setOpen(false)}>
          Switch to client portal
        </Link>
      )}
      <div className="mt-auto flex items-center gap-2 border-t border-zinc-200 pt-3">
        <div className="min-w-0 flex-1 px-2">
          <p className="truncate text-sm font-medium">{session?.user.name}</p>
          <p className="truncate text-xs text-zinc-500">{session?.user.email}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Logout" onClick={() => void logout()}>
          <LogOut size={16} />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2 md:hidden">
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-zinc-100">
          <Menu size={20} />
        </button>
        <span className="font-bold">ScopeBridge</span>
        <Link href="/notifications" aria-label="Notifications" className="relative ml-auto rounded-md p-2 hover:bg-zinc-100">
          <Bell size={20} />
          {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">{unread}</span>}
        </Link>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-2 top-2 rounded-md p-2 hover:bg-zinc-100">
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="mx-auto flex max-w-7xl gap-0">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-zinc-200 bg-white md:block">
          <div className="flex h-full flex-col">
            {sidebar}
            <div className="border-t border-zinc-200 p-3">
              <Link href="/notifications" className="relative flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100">
                <Bell size={16} /> Notifications
                {unread > 0 && <span className="ml-auto rounded-full bg-red-600 px-2 text-xs text-white">{unread}</span>}
              </Link>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
