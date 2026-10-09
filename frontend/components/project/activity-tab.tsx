"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";

export function ActivityTab({ projectId, workspaceId }: { projectId?: string; workspaceId?: string }) {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const scope = projectId ? `projectId=${projectId}` : `workspaceId=${workspaceId}`;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["activity", scope, page, q],
    queryFn: () =>
      api
        .get<any[]>(`/api/activity?${scope}&page=${page}&limit=30${q ? `&action=${encodeURIComponent(q)}` : ""}`)
        .then((r) => ({ items: r.data, meta: r.meta! })),
    enabled: !!(projectId || workspaceId),
  });

  return (
    <div className="grid gap-2">
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(action); }} className="flex gap-2">
        <Input aria-label="Filter by action" placeholder="Filter by action, e.g. scope.version.approved" value={action} onChange={(e) => setAction(e.target.value)} />
        <Button variant="outline" type="submit">Filter</Button>
      </form>
      {isLoading && <ListSkeleton />}
      {error && <ErrorState message="Could not load activity." onRetry={() => refetch()} />}
      {data && data.items.length === 0 && <EmptyState title="No activity yet" />}
      {data?.items.map((a: any) => (
        <Card key={a.id}>
          <CardContent className="text-sm">
            <p><span className="font-mono text-xs font-medium">{a.action}</span> <span className="text-warm-500">{a.entityType}{a.entityId ? ` ${String(a.entityId).slice(0, 8)}…` : ""}</span></p>
            <p className="text-xs text-warm-500">{a.actor?.name ?? a.actorType} · {format(new Date(a.createdAt), "MMM d, yyyy HH:mm")}</p>
            {a.metadata && Object.keys(a.metadata).length > 0 && (
              <pre className="mt-1 overflow-auto rounded bg-warm-50 p-1 text-xs">{JSON.stringify(a.metadata, null, 2)}</pre>
            )}
          </CardContent>
        </Card>
      ))}
      {data && data.meta.totalPages > 1 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
          <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
      <p className="text-xs text-warm-500">Select filter: <Select aria-label="Quick filter" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}><option value="">All actions</option><option value="scope.version.approved">Scope approvals</option><option value="task.status_changed">Task changes</option><option value="cr.submitted">Change requests</option><option value="ai.completed">AI runs</option></Select></p>
    </div>
  );
}
