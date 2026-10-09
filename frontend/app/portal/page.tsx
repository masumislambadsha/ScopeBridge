"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PortalShell } from "@/components/shells/portal-shell";
import { PortalGuard } from "@/components/shells/guards";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";

export default function PortalHome() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["portal-projects"],
    queryFn: () => api.get<any[]>("/api/portal/projects").then((r) => r.data),
  });

  return (
    <PortalGuard>
      <PortalShell>
        <PageHeader title="My projects" />
        {isLoading && <ListSkeleton />}
        {error && <ErrorState message="Could not load projects." onRetry={() => refetch()} />}
        {data && data.length === 0 && <EmptyState title="No projects yet" hint="Your agency will invite you once work starts." />}
        <div className="grid gap-2">
          {data?.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-1 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <Link href={`/portal/projects/${p.id}`} className="font-medium underline">{p.name}</Link>
                  <p className="text-xs text-zinc-500">{p.projectTypeLabel ?? p.projectType} · {p.progress.completed}/{p.progress.total} tasks ({p.progress.percent}%)</p>
                </div>
                <StatusBadge status={p.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      </PortalShell>
    </PortalGuard>
  );
}
