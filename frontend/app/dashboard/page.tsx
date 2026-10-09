"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { ArrowRight, CalendarClock, FolderKanban } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/eyebrow";
import { BlurFade } from "@/components/magicui/blur-fade";
import { NumberTicker } from "@/components/magicui/number-ticker";

const COLORS = ["#4a7c74", "#0d9488", "#1acd81", "#f59e0b", "#c47a5a", "#7d9d94"];

export default function DashboardPage() {
  const { workspaceId } = useWorkspace();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard", workspaceId],
    queryFn: () => api.get<any>(`/api/dashboard/analytics?workspaceId=${workspaceId}`).then((r) => r.data),
    enabled: !!workspaceId,
  });

  return (
    <AgencyGuard>
      <AgencyShell>
        <PageHeader title="Dashboard" hint="Workspace health at a glance" />
        {!workspaceId && <EmptyState title="No workspace yet" hint="Create a workspace to get started." action={<Link href="/workspaces" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-warm-50">Go to workspaces</Link>} />}
        {workspaceId && isLoading && <ListSkeleton rows={4} />}
        {workspaceId && error && <ErrorState message="Could not load analytics." onRetry={() => refetch()} />}

        {workspaceId && data && data.scope === "my-work" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardHeader><CardTitle>My tasks</CardTitle></CardHeader><CardContent><p className="font-serif text-4xl"><NumberTicker value={Number(data.myTasks ?? 0)} /></p></CardContent></Card>
            <Card className="sm:col-span-2"><CardHeader><CardTitle>Upcoming deadlines</CardTitle></CardHeader><CardContent>
              {(data.upcomingDeadlines ?? []).length === 0 && <p className="text-sm text-warm-500">Nothing due soon.</p>}
              <ul className="grid gap-1.5 text-sm">{(data.upcomingDeadlines ?? []).map((t: any) => <li key={t.id} className="flex justify-between gap-2 rounded-xl bg-warm-50 px-3 py-2"><span className="truncate font-medium">{t.code} — {t.title}</span><span className="shrink-0 text-warm-500">{t.deadline ? format(new Date(t.deadline), "MMM d") : ""}</span></li>)}</ul>
            </CardContent></Card>
          </div>
        )}

        {workspaceId && data && data.scope === "workspace" && (
          <div className="grid gap-4">
            {/* Hero */}
            <BlurFade inView>
              <div className="relative overflow-hidden rounded-[2rem] bg-ink p-8 text-warm-50 md:p-10">
                <div className="bg-dot-pattern absolute inset-0 opacity-[0.07]" aria-hidden />
                <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-sage-600/20 blur-[120px]" aria-hidden />
                <div className="relative flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <Eyebrow dark>Workspace overview</Eyebrow>
                    <h2 className="mt-3 font-serif text-3xl md:text-4xl">
                      <NumberTicker value={Number(data.totals?.activeProjects ?? 0)} /> active projects · <NumberTicker value={Number(data.totals?.pendingApprovals ?? 0)} /> awaiting approval
                    </h2>
                    <p className="mt-2 text-[15px] text-warm-300">
                      {data.totals?.completedTasks ?? 0}/{data.totals?.totalTasks ?? 0} tasks done · {data.totals?.pendingChangeRequests ?? 0} open change requests
                    </p>
                  </div>
                  <Link href="/projects" className="flex items-center gap-2 rounded-full bg-warm-50 px-6 py-3 text-sm font-semibold text-ink transition-transform hover:scale-[1.02]">
                    <FolderKanban size={16} /> View projects <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </BlurFade>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                ["Projects", data.totals.totalProjects, "active: " + data.totals.activeProjects, "bg-sage-50 text-sage-700"],
                ["Clients", data.totals.totalClients, "relationships", "bg-teal-50 text-teal-800"],
                ["Pending approvals", data.totals.pendingApprovals, "need signatures", "bg-amber-50 text-amber-800"],
                ["Open change requests", data.totals.pendingChangeRequests, `approved ${data.totals.approvedChanges} · rejected ${data.totals.rejectedChanges}`, "bg-orange-50 text-orange-800"],
              ].map(([label, value, sub, tint]) => (
                <BlurFade inView key={label as string}>
                  <Card>
                    <CardHeader><CardTitle>{label as string}</CardTitle></CardHeader>
                    <CardContent>
                      <p className="font-serif text-4xl"><NumberTicker value={Number(value ?? 0)} /></p>
                      <p className="mt-1 text-xs text-warm-500">{sub as string}</p>
                      <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${tint}`}>{label as string}</span>
                    </CardContent>
                  </Card>
                </BlurFade>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Tasks by status</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(data.series.tasksByStatus ?? []).map((s: any) => ({ name: s.status, count: s._count }))}>
                      <XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip contentStyle={{ borderRadius: 16 }} />
                      <Bar dataKey="count" fill="#4a7c74" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Projects by status</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={(data.series.projectsByStatus ?? []).map((s: any) => ({ name: s.status, value: s._count }))} dataKey="value" nameKey="name" outerRadius={80} label>
                        {(data.series.projectsByStatus ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle><span className="flex items-center gap-2"><CalendarClock size={17} /> Upcoming deadlines</span></CardTitle></CardHeader>
              <CardContent>
                {(data.upcomingDeadlines ?? []).length === 0 && <p className="text-sm text-warm-500">Nothing due soon.</p>}
                <ul className="grid gap-1.5 text-sm">{(data.upcomingDeadlines ?? []).map((t: any) => <li key={t.id} className="flex justify-between gap-2 rounded-xl bg-warm-50 px-3 py-2 dark:bg-white/5"><span className="truncate font-medium">{t.code} — {t.title} ({t.assignee?.name ?? "unassigned"})</span><span className="shrink-0 text-warm-500">{t.deadline ? format(new Date(t.deadline), "MMM d") : ""}</span></li>)}</ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
              <CardContent>
                <ul className="grid gap-1.5 text-sm">{(data.recentActivity ?? []).map((a: any) => <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-warm-200/60 px-3 py-2"><StatusBadge status="gray" /><span className="font-mono text-xs">{a.action}</span><span className="text-warm-500">{a.actor?.name ?? a.actorType} · {format(new Date(a.createdAt), "MMM d HH:mm")}</span></li>)}</ul>
              </CardContent>
            </Card>
          </div>
        )}
      </AgencyShell>
    </AgencyGuard>
  );
}
