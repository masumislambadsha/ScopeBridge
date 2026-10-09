"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader, Table } from "@/components/ui/layout";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";

export default function ProjectsPage() {
  const { workspaceId } = useWorkspace();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["projects", workspaceId, page, status, q],
    queryFn: () =>
      api
        .get<any[]>(`/api/projects?workspaceId=${workspaceId}&page=${page}&limit=20${status ? `&status=${status}` : ""}${q ? `&search=${encodeURIComponent(q)}` : ""}`)
        .then((r) => ({ items: r.data, meta: r.meta! })),
    enabled: !!workspaceId,
  });

  return (
    <AgencyGuard>
      <AgencyShell>
        <PageHeader title="Projects" actions={<Link href="/projects/new" className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white">New project</Link>} />
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(search); }} className="flex flex-col gap-2 sm:flex-row">
          <Input aria-label="Search projects" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select aria-label="Status filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="PLANNING">Planning</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <Button variant="outline" type="submit">Search</Button>
        </form>
        <div className="mt-3">
          {isLoading && <ListSkeleton />}
          {error && <ErrorState message="Could not load projects." onRetry={() => refetch()} />}
          {data && data.items.length === 0 && <EmptyState title="No projects" hint="Create your first project." action={<Link href="/projects/new" className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white">New project</Link>} />}
          {data && data.items.length > 0 && (
            <>
              <div className="hidden md:block">
                <Table>
                  <thead><tr className="border-b text-left text-xs text-zinc-500"><th className="p-2">Name</th><th className="p-2">Client</th><th className="p-2">Type</th><th className="p-2">Deadline</th><th className="p-2">Status</th></tr></thead>
                  <tbody>
                    {data.items.map((p: any) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="p-2 font-medium"><Link className="underline" href={`/projects/${p.id}`}>{p.name}</Link></td>
                        <td className="p-2">{p.client?.name ?? "—"}</td>
                        <td className="p-2 text-xs">{p.projectType}</td>
                        <td className="p-2 text-xs">{p.deadline ? new Date(p.deadline).toLocaleDateString() : "—"}</td>
                        <td className="p-2"><StatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div className="grid gap-2 md:hidden">
                {data.items.map((p: any) => (
                  <Card key={p.id}><CardContent>
                    <Link className="font-medium underline" href={`/projects/${p.id}`}>{p.name}</Link>
                    <p className="text-xs text-zinc-500">{p.client?.name} · {p.projectType}</p>
                    <StatusBadge status={p.status} />
                  </CardContent></Card>
                ))}
              </div>
              {data.meta.totalPages > 1 && (
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              )}
            </>
          )}
        </div>
      </AgencyShell>
    </AgencyGuard>
  );
}
