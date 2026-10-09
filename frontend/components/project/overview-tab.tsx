"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListSkeleton, ErrorState, EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

const STAGES = ["intake", "requirements", "scope", "approved", "development", "changes", "completed"] as const;
const STAGE_LABELS: Record<string, string> = {
  intake: "Intake", requirements: "Requirements", scope: "Scope", approved: "Approved",
  development: "Development", changes: "Changes", completed: "Completed",
};

export function OverviewTab({ projectId }: { projectId: string }) {
  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["traceability", projectId],
    queryFn: () => api.get<any>(`/api/projects/${projectId}/traceability`).then((r) => r.data),
  });

  if (isLoading) return <ListSkeleton rows={4} />;
  if (error) return <ErrorState message="Could not load traceability." onRetry={() => refetch()} />;
  if (!data) return <EmptyState title="No data" />;

  const stageIdx = STAGES.indexOf(data.project.stage);
  const reqMap = new Map((data.requirements as any[]).map((r) => [r.id, r]));
  const verMap = new Map((data.versions as any[]).map((v) => [v.id, v]));
  const taskMap = new Map((data.tasks as any[]).map((t) => [t.id, t]));
  const sel = selectedReq ? reqMap.get(selectedReq) : null;

  return (
    <div className="grid gap-3">
      <Card>
        <CardHeader><CardTitle>Workflow</CardTitle></CardHeader>
        <CardContent>
          <ol className="flex flex-wrap items-center gap-1">
            {STAGES.map((s, i) => (
              <li key={s} className="flex items-center gap-1">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${i <= stageIdx ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                  {STAGE_LABELS[s]}
                </span>
                {i < STAGES.length - 1 && <span className="text-zinc-300">→</span>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Requirements ({data.requirements.length})</CardTitle></CardHeader>
          <CardContent>
            {data.requirements.length === 0 && <p className="text-sm text-zinc-500">None yet — they appear after client submissions are analyzed.</p>}
            <ul className="grid gap-1 text-sm">
              {data.requirements.map((r: any) => (
                <li key={r.id}>
                  <button className="w-full rounded-md p-1 text-left hover:bg-zinc-50" onClick={() => setSelectedReq(r.id)}>
                    <span className="font-mono text-xs text-zinc-500">{r.code}</span> {r.title} <StatusBadge status={r.status} />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Scope versions ({data.versions.length}) · Change requests ({data.changeRequests.length})</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <ul className="grid gap-1">
              {data.versions.map((v: any) => (
                <li key={v.id}>v{v.version} <StatusBadge status={v.status} /> <span className="text-xs text-zinc-500">{v.requirementLinks?.length ?? 0} requirements</span></li>
              ))}
              {data.versions.length === 0 && <li className="text-zinc-500">No scope yet.</li>}
            </ul>
            <ul className="grid gap-1">
              {data.changeRequests.map((c: any) => (
                <li key={c.id}><span className="font-mono text-xs">{c.code}</span> {c.title} <StatusBadge status={c.status} /></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <Dialog open={!!sel} onClose={() => setSelectedReq(null)} title={sel ? `${sel.code} — ${sel.title}` : ""} wide>
        {sel && (
          <div className="grid gap-2 text-sm">
            <p><b>Status:</b> <StatusBadge status={sel.status} /></p>
            <p><b>Source:</b> {sel.source}</p>
            <div>
              <p className="font-medium">In scope versions:</p>
              <ul className="list-disc pl-5">{((data.links.requirementVersions ?? {})[sel.id] ?? []).map((id: string) => <li key={id}>v{verMap.get(id)?.version} ({verMap.get(id)?.status})</li>)}</ul>
            </div>
            <div>
              <p className="font-medium">Implemented by tasks:</p>
              <ul className="list-disc pl-5">{((data.links.requirementTasks ?? {})[sel.id] ?? []).map((id: string) => <li key={id}>{taskMap.get(id)?.code} — {taskMap.get(id)?.title} ({taskMap.get(id)?.status})</li>)}</ul>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
