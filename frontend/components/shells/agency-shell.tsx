"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Menu, X, LayoutDashboard, FolderKanban, Users, Settings, CheckSquare, Activity, HeartHandshake } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/tasks", label: "My tasks", icon: CheckSquare },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/workspaces", label: "Workspaces", icon: FolderKanban },
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

  const membership = session?.memberships.find((m) => m.workspaceId === workspaceId);
  const role = membership?.role;
  const items = NAV.filter((n) => {
    if (n.href.startsWith("/settings") && role !== "ADMIN") return false;
    return true;
  }).map((n) => {
    // Fix legacy Team link intent: point Team-attached members view at workspace members page
    if (n.label === "Team") return { ...n, href: workspaceId ? `/workspaces/${workspaceId}/members` : "/workspaces" };
    return n;
  });

  const sidebar = (
    <div className="flex h-full flex-col gap-1 p-4">
      <Link href="/dashboard" className="mb-3 flex items-center gap-2.5 px-2" onClick={() => setOpen(false)}>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sage-600 to-teal-600 text-white">
          <HeartHandshake size={20} />
        </span>
        <span className="font-serif text-xl text-white">ScopeBridge</span>
      </Link>
      {session && session.memberships.length > 0 && (
        <select
          aria-label="Workspace"
          className="mb-3 h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sage-500"
          value={workspaceId ?? ""}
          onChange={(e) => {
            setWorkspaceId(e.target.value);
            router.push("/dashboard");
          }}
        >
          {session.memberships.map((m) => (
            <option key={m.workspaceId} value={m.workspaceId} className="text-black">
              {m.workspaceName} ({m.role})
            </option>
          ))}
        </select>
      )}
      {items.map((n) => {
        const active = pathname === n.href || pathname.startsWith(n.href + "/");
        return (
          <Link
            key={n.href + n.label}
            href={n.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
              active ? "bg-sage-600 text-white shadow-lg shadow-sage-600/25" : "text-warm-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <n.icon size={17} /> {n.label}
          </Link>
        );
      })}
      {session && session.portalAccess.length > 0 && (
        <Link
          href="/portal"
          className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-warm-300 hover:text-white"
          onClick={() => setOpen(false)}
        >
          Switch to client portal
        </Link>
      )}
      <div className="mt-auto flex items-center gap-2 border-t border-white/10 pt-4">
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-semibold text-white">{session?.user.name}</p>
          <p className="truncate text-xs text-warm-400">{session?.user.email}</p>
        </div>
        <ThemeToggle className="text-warm-300" />
        <button aria-label="Logout" onClick={() => void logout()} className="rounded-xl p-2 text-warm-300 hover:bg-white/5 hover:text-white">
          <LogOut size={17} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-warm-950">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-warm-200/70 bg-white/80 px-3 py-2 backdrop-blur-xl md:hidden dark:bg-[#131110]/85">
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-xl p-2 hover:bg-sage-50">
          <Menu size={20} />
        </button>
        <span className="font-serif text-lg">ScopeBridge</span>
        <Link href="/notifications" aria-label="Notifications" className="relative ml-auto rounded-xl p-2 hover:bg-sage-50">
          <Bell size={20} />
          {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span>}
        </Link>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-ink shadow-2xl">
            <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-2 top-2 rounded-xl p-2 text-white hover:bg-white/10">
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="mx-auto flex max-w-shell gap-0">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-ink md:block lg:w-64">
          <div className="flex h-full flex-col">
            {sidebar}
            <div className="p-4 pt-0">
              <Link href="/notifications" className="relative flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm text-warm-300 hover:bg-white/5 hover:text-white">
                <Bell size={17} /> Notifications
                {unread > 0 && <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{unread}</span>}
              </Link>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
