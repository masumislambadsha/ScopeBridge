"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PortalShell } from "@/components/shells/portal-shell";
import { PortalGuard } from "@/components/shells/guards";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";

export default function PortalRequirementsPage({ params }: { params: { id: string } }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["portal-project", params.id, "reqs"],
    queryFn: () => api.get<any>(`/api/portal/projects/${params.id}`).then((r) => r.data),
  });

  return (
    <PortalGuard>
      <PortalShell>
        <PageHeader title="Requirements" hint="What we understood from your input." />
        {isLoading && <ListSkeleton />}
        {error && <ErrorState message="Could not load requirements." onRetry={() => refetch()} />}
        {data && data.requirements.length === 0 && <EmptyState title="No requirements yet" />}
        <div className="grid gap-2">
          {data?.requirements.map((r: any) => (
            <Card key={r.id}>
              <CardContent>
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-zinc-600">{r.description}</p>
                {(r.acceptanceCriteria ?? []).length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-xs text-zinc-600">
                    {r.acceptanceCriteria.map((c: any, i: number) => <li key={i}>Given {c.given}, when {c.when}, then {c.then}</li>)}
                  </ul>
                )}
                <StatusBadge status={r.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      </PortalShell>
    </PortalGuard>
  );
}
