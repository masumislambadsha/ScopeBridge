"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";

const COLORS = ["#18181b", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"];

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
        {!workspaceId && <EmptyState title="No workspace yet" hint="Create a workspace to get started." action={<Link href="/workspaces" className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white">Go to workspaces</Link>} />}
        {workspaceId && isLoading && <ListSkeleton rows={4} />}
        {workspaceId && error && <ErrorState message="Could not load analytics." onRetry={() => refetch()} />}
        {workspaceId && data && data.scope === "my-work" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Card><CardHeader><CardTitle>My tasks</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{data.myTasks}</p></CardContent></Card>
            <Card className="sm:col-span-2"><CardHeader><CardTitle>Upcoming deadlines</CardTitle></CardHeader><CardContent>
              {(data.upcomingDeadlines ?? []).length === 0 && <p className="text-sm text-zinc-500">Nothing due soon.</p>}
              <ul className="grid gap-1 text-sm">{(data.upcomingDeadlines ?? []).map((t: any) => <li key={t.id} className="flex justify-between gap-2"><span className="truncate">{t.code} — {t.title}</span><span className="shrink-0 text-zinc-500">{t.deadline ? format(new Date(t.deadline), "MMM d") : ""}</span></li>)}</ul>
            </CardContent></Card>
          </div>
        )}
        {workspaceId && data && data.scope === "workspace" && (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Projects", data.totals.totalProjects, "active: " + data.totals.activeProjects],
                ["Clients", data.totals.totalClients, ""],
                ["Pending approvals", data.totals.pendingApprovals, ""],
                ["Open change requests", data.totals.pendingChangeRequests, `approved ${data.totals.approvedChanges} · rejected ${data.totals.rejectedChanges}`],
                ["Requirements", data.totals.totalRequirements, ""],
                ["Tasks", `${data.totals.completedTasks}/${data.totals.totalTasks}`, "completed"],
              ].map(([label, value, sub]) => (
                <Card key={label as string}>
                  <CardHeader><CardTitle>{label}</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold">{value as string}</p><p className="text-xs text-zinc-500">{sub as string}</p></CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Tasks by status</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(data.series.tasksByStatus ?? []).map((s: any) => ({ name: s.status, count: s._count }))}>
                      <XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip />
                      <Bar dataKey="count" fill="#18181b" />
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
              <CardHeader><CardTitle>Upcoming deadlines</CardTitle></CardHeader>
              <CardContent>
                {(data.upcomingDeadlines ?? []).length === 0 && <p className="text-sm text-zinc-500">Nothing due soon.</p>}
                <ul className="grid gap-1 text-sm">{(data.upcomingDeadlines ?? []).map((t: any) => <li key={t.id} className="flex justify-between gap-2"><span className="truncate">{t.code} — {t.title} ({t.assignee?.name ?? "unassigned"})</span><span className="shrink-0 text-zinc-500">{t.deadline ? format(new Date(t.deadline), "MMM d") : ""}</span></li>)}</ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
              <CardContent>
                <ul className="grid gap-1 text-sm">{(data.recentActivity ?? []).map((a: any) => <li key={a.id} className="flex flex-wrap items-center gap-2"><StatusBadge status="gray" /><span className="font-mono text-xs">{a.action}</span><span className="text-zinc-500">{a.actor?.name ?? a.actorType} · {format(new Date(a.createdAt), "MMM d HH:mm")}</span></li>)}</ul>
              </CardContent>
            </Card>
          </div>
        )}
      </AgencyShell>
    </AgencyGuard>
  );
}
