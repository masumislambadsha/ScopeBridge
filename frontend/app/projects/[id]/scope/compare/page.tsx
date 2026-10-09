"use client";
import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, ErrorState } from "@/components/ui/states";

export default function ScopeComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const scopes = useQuery({
    queryKey: ["scope", id, "compare"],
    queryFn: () => api.get<any[]>(`/api/scopes?projectId=${id}`).then((r) => r.data[0] ?? null),
  });
  const versions = (scopes.data?.versions ?? []) as any[];
  const cmp = useQuery({
    queryKey: ["scope-compare", from, to],
    queryFn: () => api.get<any>(`/api/scopes/${scopes.data.id}/compare?from=${from}&to=${to}`).then((r) => r.data),
    enabled: !!from && !!to && !!scopes.data,
  });

  return (
    <AgencyGuard>
      <AgencyShell>
        <PageHeader title="Compare scope versions" />
        {scopes.isLoading && <ListSkeleton />}
        {scopes.error && <ErrorState message="Could not load versions." onRetry={() => scopes.refetch()} />}
        <div className="flex flex-wrap gap-2">
          <Select aria-label="From version" value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">From…</option>
            {versions.map((v: any) => <option key={v.id} value={v.id}>v{v.version} ({v.status})</option>)}
          </Select>
          <Select aria-label="To version" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">To…</option>
            {versions.map((v: any) => <option key={v.id} value={v.id}>v{v.version} ({v.status})</option>)}
          </Select>
        </div>
        {cmp.data && (
          <Card className="mt-3">
            <CardHeader><CardTitle>Diff v{cmp.data.from.version} → v{cmp.data.to.version}</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div className="grid gap-2 md:grid-cols-3">
                <div><p className="font-medium text-green-700">Added ({cmp.data.features.added.length})</p><ul className="list-disc pl-5">{cmp.data.features.added.map((f: any) => <li key={f.id}>{f.title}</li>)}</ul></div>
                <div><p className="font-medium text-red-700">Removed ({cmp.data.features.removed.length})</p><ul className="list-disc pl-5">{cmp.data.features.removed.map((f: any) => <li key={f.id}>{f.title}</li>)}</ul></div>
                <div><p className="font-medium text-amber-700">Modified ({cmp.data.features.modified.length})</p><ul className="list-disc pl-5">{cmp.data.features.modified.map((m: any) => <li key={m.after.id}>{m.after.title}</li>)}</ul></div>
              </div>
              <p><b>Deliverables +:</b> {(cmp.data.deliverables.added ?? []).join(", ") || "—"} <b>−:</b> {(cmp.data.deliverables.removed ?? []).join(", ") || "—"}</p>
              <p><b>Exclusions +:</b> {(cmp.data.exclusions.added ?? []).join(", ") || "—"} <b>−:</b> {(cmp.data.exclusions.removed ?? []).join(", ") || "—"}</p>
            </CardContent>
          </Card>
        )}
      </AgencyShell>
    </AgencyGuard>
  );
}
