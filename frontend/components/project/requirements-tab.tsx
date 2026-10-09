"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { ListSkeleton, EmptyState, ErrorState, AiDraftLabel } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

export function RequirementsTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [clarifyIds, setClarifyIds] = useState<string[] | null>(null);
  const [clarifyQ, setClarifyQ] = useState("");

  const reqs = useQuery({
    queryKey: ["requirements", projectId, status],
    queryFn: () => api.get<any[]>(`/api/requirements?projectId=${projectId}&limit=100${status ? `&status=${status}` : ""}`).then((r) => r.data),
  });
  const readiness = useQuery({
    queryKey: ["readiness", projectId],
    queryFn: () => api.get<any>(`/api/projects/${projectId}/readiness`).then((r) => r.data).catch(() => null),
  });

  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { priority: "MEDIUM" } });
  const create = useMutation({
    mutationFn: (v: z.infer<typeof schema>) => api.post("/api/requirements", { ...v, projectId }),
    onSuccess: () => {
      toast.success("Requirement created");
      form.reset({ priority: "MEDIUM" } as never);
      void qc.invalidateQueries({ queryKey: ["requirements", projectId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Create failed"),
  });
  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/api/requirements/${id}/approve`, {}),
    onSuccess: () => {
      toast.success("Requirement approved");
      void qc.invalidateQueries({ queryKey: ["requirements", projectId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Approve failed"),
  });
  const mark = useMutation({
    mutationFn: (verdict: "READY" | "NEEDS_CLARIFICATION") =>
      api.post("/api/requirements/mark", { projectId, requirementIds: checked, verdict }),
    onSuccess: (_, verdict) => {
      toast.success(`Marked ${verdict}`);
      setChecked([]);
      void qc.invalidateQueries({ queryKey: ["requirements", projectId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Bulk update failed"),
  });
  const clarify = useMutation({
    mutationFn: () =>
      api.post("/api/requirements/request-clarification", {
        projectId,
        requirementIds: clarifyIds,
        questions: [{ id: "c1", question: clarifyQ, answerType: "text", required: true }],
      }),
    onSuccess: () => {
      toast.success("Clarification sent to client");
      setClarifyIds(null);
      setClarifyQ("");
      void qc.invalidateQueries({ queryKey: ["requirements", projectId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Clarification failed"),
  });
  const rerunReadiness = useMutation({
    mutationFn: () => api.post("/api/ai/readiness", { projectId }),
    onSuccess: () => toast.success("Readiness analysis queued"),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Queue failed"),
  });

  return (
    <div className="grid gap-3">
      {readiness.data && (
        <Card>
          <CardHeader><CardTitle>Requirement Readiness: {readiness.data.score}%</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="h-2 overflow-hidden rounded bg-warm-100">
              <div className="h-full bg-ink" style={{ width: `${readiness.data.score}%` }} />
            </div>
            {readiness.data.summary && <p className="text-warm-600">{readiness.data.summary}</p>}
            {(readiness.data.missingInformation ?? []).length > 0 && (
              <div>
                <p className="font-medium">Missing information</p>
                <ul className="list-disc pl-5">
                  {(readiness.data.missingInformation ?? []).map((m: any, i: number) => (
                    <li key={i}>{m.topic}: {m.question}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => rerunReadiness.mutate()}>Re-run readiness</Button>
              <Button
                size="sm"
                variant="outline"
                disabled={checked.length === 0}
                onClick={() => {
                  const first = (readiness.data.missingInformation ?? [])[0];
                  setClarifyQ(first?.question ?? "");
                  setClarifyIds([...checked]);
                }}
              >
                Request clarification ({checked.length})
              </Button>
              <Button size="sm" variant="outline" disabled={checked.length === 0} onClick={() => mark.mutate("READY")}>
                Mark ready ({checked.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Manual requirement</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="req-title">Title</Label>
              <Input id="req-title" {...form.register("title")} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="req-desc">Description</Label>
              <Textarea id="req-desc" {...form.register("description")} />
            </div>
            <div>
              <Label htmlFor="req-cat">Category</Label>
              <Input id="req-cat" {...form.register("category")} />
            </div>
            <div>
              <Label htmlFor="req-pri">Priority</Label>
              <Select id="req-pri" {...form.register("priority")}>
                <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
              </Select>
            </div>
            <div className="sm:col-span-2"><Button type="submit" disabled={create.isPending}>Add requirement</Button></div>
          </form>
        </CardContent>
      </Card>
      <div className="flex items-center gap-2">
        <Label htmlFor="req-filter">Status</Label>
        <Select id="req-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="DRAFT">Draft</option>
          <option value="NEEDS_CLARIFICATION">Needs clarification</option>
          <option value="READY">Ready</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </Select>
      </div>
      {reqs.isLoading && <ListSkeleton />}
      {reqs.error && <ErrorState message="Could not load requirements." onRetry={() => reqs.refetch()} />}
      {reqs.data && reqs.data.length === 0 && <EmptyState title="No requirements" hint="Client answers are analyzed automatically, or add manually above." />}
      <div className="grid gap-2">
        {reqs.data?.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-1 sm:flex-row sm:items-center">
              <input
                type="checkbox"
                aria-label={`Select ${r.code}`}
                checked={checked.includes(r.id)}
                onChange={(e) => setChecked(e.target.checked ? [...checked, r.id] : checked.filter((c) => c !== r.id))}
              />
              <div className="flex-1">
                <p className="font-medium"><span className="font-mono text-xs text-warm-500">{r.code}</span> {r.title}</p>
                <p className="flex flex-wrap items-center gap-1 text-xs text-warm-500">
                  <StatusBadge status={r.status} /> {r.source} · {r.priority}
                  {r.acceptanceCriteriaStatus === "AI_DRAFT" && <AiDraftLabel />}
                  {r.acceptanceCriteriaStatus === "REVIEWED" && <StatusBadge status="REVIEWED" />}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelected(r)}>Details</Button>
                {(r.status === "READY" || r.status === "DRAFT") && <Button size="sm" onClick={() => setApproveId(r.id)}>Approve</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.code} — ${selected.title}` : ""} wide>
        {selected && (
          <div className="grid gap-2 text-sm">
            <p className="whitespace-pre-wrap">{selected.description}</p>
            {selected.sourceContext && <div><p className="font-medium">Source excerpt</p><p className="whitespace-pre-wrap rounded bg-warm-50 p-2 text-xs">{selected.sourceContext}</p></div>}
            {selected.aiFlags && <div><p className="font-medium">AI flags</p><pre className="overflow-auto rounded bg-warm-50 p-2 text-xs">{JSON.stringify(selected.aiFlags, null, 2)}</pre></div>}
            <div>
              <p className="font-medium">Appears in</p>
              <ul className="list-disc pl-5 text-xs">
                {(selected.scopeVersionLinks ?? []).map((l: any) => <li key={l.scopeVersion.id}>Scope v{l.scopeVersion.version} ({l.scopeVersion.status})</li>)}
                {(selected.tasks ?? []).map((t: any) => <li key={t.id}>Task {t.code} — {t.title} ({t.status})</li>)}
              </ul>
            </div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={!!approveId} onClose={() => setApproveId(null)} onConfirm={() => approveId && approve.mutate(approveId)} title="Approve requirement?" body="Only a human can approve. This cannot be undone by AI." confirmLabel="Approve" />
      <Dialog open={!!clarifyIds} onClose={() => setClarifyIds(null)} title="Request clarification">
        <div className="grid gap-2">
          <Label htmlFor="clar-q">Question for the client</Label>
          <Textarea id="clar-q" value={clarifyQ} onChange={(e) => setClarifyQ(e.target.value)} />
          <Button disabled={!clarifyQ.trim() || clarify.isPending} onClick={() => clarify.mutate()}>Send clarification request</Button>
        </div>
      </Dialog>
    </div>
  );
}
