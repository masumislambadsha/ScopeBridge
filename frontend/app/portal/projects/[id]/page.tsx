"use client";
import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PortalShell } from "@/components/shells/portal-shell";
import { PortalGuard } from "@/components/shells/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";

export default function PortalProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["portal-project", id],
    queryFn: () => api.get<any>(`/api/portal/projects/${id}`).then((r) => r.data),
  });

  return (
    <PortalGuard>
      <PortalShell>
        {isLoading && <ListSkeleton rows={4} />}
        {error && <ErrorState message="Could not load project." onRetry={() => refetch()} />}
        {data && (
          <>
            <PageHeader title={data.name} hint={data.description ?? ""} actions={<StatusBadge status={data.status} />} />
            <div className="grid gap-3">
              <Card>
                <CardHeader><CardTitle>Progress — {data.progress.percent}%</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-2 overflow-hidden rounded bg-zinc-100">
                    <div className="h-full bg-zinc-900" style={{ width: `${data.progress.percent}%` }} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">{data.progress.completed} of {data.progress.total} tasks complete</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    <Link className="rounded-md border px-3 py-1.5 hover:bg-zinc-50" href={`/portal/projects/${id}/scope`}>Review scope</Link>
                    <Link className="rounded-md border px-3 py-1.5 hover:bg-zinc-50" href={`/portal/projects/${id}/change-requests`}>Change requests</Link>
                    <Link className="rounded-md border px-3 py-1.5 hover:bg-zinc-50" href={`/portal/projects/${id}/messages`}>Messages</Link>
                    <Link className="rounded-md border px-3 py-1.5 hover:bg-zinc-50" href={`/portal/projects/${id}/requirements`}>Requirements</Link>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Open requests ({data.informationRequests.length})</CardTitle></CardHeader>
                <CardContent>
                  {data.informationRequests.length === 0 && <p className="text-sm text-zinc-500">Nothing waiting on you.</p>}
                  <ul className="grid gap-1 text-sm">
                    {data.informationRequests.map((r: any) => (
                      <li key={r.id}><Link className="underline" href={`/portal/projects/${id}/requests/${r.id}`}>{r.title}</Link> <StatusBadge status={r.status} /></li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Pending approvals ({data.approvals.filter((a: any) => a.status === "PENDING").length})</CardTitle></CardHeader>
                <CardContent>
                  <ul className="grid gap-1 text-sm">
                    {data.approvals.map((a: any) => (
                      <li key={a.id}>Scope v{a.scopeVersion?.version} <StatusBadge status={a.status} /> <Link className="underline" href={`/portal/projects/${id}/scope`}>Review</Link></li>
                    ))}
                    {data.approvals.length === 0 && <li className="text-zinc-500">None.</li>}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </PortalShell>
    </PortalGuard>
  );
}
