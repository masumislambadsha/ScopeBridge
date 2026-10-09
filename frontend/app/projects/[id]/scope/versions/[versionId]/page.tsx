"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";

export default function ScopeVersionPage({ params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { versionId } = use(params);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["scope-version", versionId],
    queryFn: () => api.get<any>(`/api/scope-versions/${versionId}`).then((r) => r.data),
  });

  return (
    <AgencyGuard>
      <AgencyShell>
        <PageHeader title={data ? `Scope v${data.version}` : "Scope version"} actions={data && <StatusBadge status={data.status} />} />
        {isLoading && <ListSkeleton rows={3} />}
        {error && <ErrorState message="Could not load version." onRetry={() => refetch()} />}
        {data && (
          <Card>
            <CardContent className="grid gap-3">
              {data.summary && <p className="text-sm text-zinc-600">{data.summary}</p>}
              <div>
                <p className="font-medium">Features ({(data.features ?? []).length})</p>
                <ul className="grid gap-2">
                  {(data.features ?? []).map((f: any) => (
                    <li key={f.id} className="rounded border p-2 text-sm">
                      <p className="font-medium">{f.title}</p>
                      <p className="text-zinc-600">{f.description}</p>
                      {(f.acceptanceCriteria ?? []).length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-xs text-zinc-600">
                          {f.acceptanceCriteria.map((c: any, i: number) => <li key={i}>Given {c.given}, when {c.when}, then {c.then}</li>)}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-1 text-sm sm:grid-cols-2">
                <div><p className="font-medium">Deliverables</p><ul className="list-disc pl-5">{(data.deliverables ?? []).map((d: string, i: number) => <li key={i}>{d}</li>)}</ul></div>
                <div><p className="font-medium">Exclusions</p><ul className="list-disc pl-5">{(data.exclusions ?? []).map((d: string, i: number) => <li key={i}>{d}</li>)}</ul></div>
              </div>
              {(data.approvals ?? []).length > 0 && (
                <div>
                  <p className="font-medium">Approval certificate</p>
                  {(data.approvals ?? []).map((a: any) => (
                    <div key={a.id} className="rounded border p-2 text-sm">
                      <p><StatusBadge status={a.status} /> {a.signatureName ?? ""} {a.decidedAt ? new Date(a.decidedAt).toLocaleString() : ""}</p>
                      {a.comment && <p className="italic">“{a.comment}”</p>}
                      <p className="font-mono text-xs text-zinc-500">hash {a.contentHash}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </AgencyShell>
    </AgencyGuard>
  );
}
