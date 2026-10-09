"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

export function ChangeRequestsTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [decision, setDecision] = useState<null | { id: string; kind: "approve" | "reject" }>(null);
  const [finalClassification, setFinalClassification] = useState("OUT_OF_SCOPE");
  const [createVersion, setCreateVersion] = useState(true);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [newFeatureTitle, setNewFeatureTitle] = useState("");

  const crs = useQuery({
    queryKey: ["change-requests", projectId, status],
    queryFn: () => api.get<any[]>(`/api/change-requests?projectId=${projectId}&limit=50${status ? `&status=${status}` : ""}`).then((r) => r.data),
  });
  const detail = useQuery({
    queryKey: ["change-request", selected?.id],
    queryFn: () => api.get<any>(`/api/change-requests/${selected.id}`).then((r) => r.data),
    enabled: !!selected,
  });

  const inv = () => {
    void qc.invalidateQueries({ queryKey: ["change-requests", projectId] });
    void qc.invalidateQueries({ queryKey: ["change-request"] });
    void qc.invalidateQueries({ queryKey: ["traceability", projectId] });
  };
  const analyze = useMutation({
    mutationFn: (id: string) => api.post(`/api/change-requests/${id}/analyze`, {}),
    onSuccess: () => {
      toast.success("AI analysis queued");
      inv();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Queue failed"),
  });
  const approve = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.post(`/api/change-requests/${id}/approve`, {
        finalClassification,
        createScopeVersion: createVersion,
        note: note || undefined,
        newFeatures: newFeatureTitle.trim()
          ? [{ title: newFeatureTitle.trim(), description: "", priority: "MEDIUM", requirementIds: [], acceptanceCriteria: [] }]
          : [],
      }),
    onSuccess: (r: any) => {
      toast.success(r.data.proposedScopeVersionId ? "Approved — v(n+1) draft proposed" : "Approved without scope change");
      setDecision(null);
      setNewFeatureTitle("");
      setNote("");
      inv();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Approve failed"),
  });
  const reject = useMutation({
    mutationFn: ({ id }: { id: string }) => api.post(`/api/change-requests/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success("Change request rejected");
      setDecision(null);
      setReason("");
      inv();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Reject failed"),
  });

  const d = detail.data;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Label htmlFor="cr-filter">Status</Label>
        <Select id="cr-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="IMPLEMENTED">Implemented</option>
        </Select>
      </div>
      {crs.isLoading && <ListSkeleton />}
      {crs.error && <ErrorState message="Could not load change requests." onRetry={() => crs.refetch()} />}
      {crs.data && crs.data.length === 0 && <EmptyState title="No change requests" hint="The client submits them from the portal." />}
      <div className="grid gap-2">
        {crs.data?.map((c: any) => (
          <Card key={c.id}>
            <CardContent className="flex flex-col gap-1 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="font-medium"><span className="font-mono text-xs text-warm-500">{c.code}</span> {c.title}</p>
                <p className="flex flex-wrap items-center gap-1 text-xs text-warm-500">
                  <StatusBadge status={c.status} />
                  {c.aiClassification && <StatusBadge status={c.aiClassification} />}
                  by {c.requestedBy?.name}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelected(c)}>Review</Button>
                <Button size="sm" variant="outline" onClick={() => analyze.mutate(c.id)}>Re-analyze</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={!!selected} onClose={() => setSelected(null)} title={d ? `${d.code} — ${d.title}` : ""} wide>
        {detail.isLoading && <ListSkeleton rows={3} />}
        {d && (
          <div className="grid gap-3 text-sm">
            <p className="whitespace-pre-wrap">{d.description}</p>
            <p><StatusBadge status={d.status} /> {d.finalClassification && <><span className="text-xs text-warm-500">PM verdict:</span> <StatusBadge status={d.finalClassification} /></>}</p>
            {d.aiClassification && (
              <Card>
                <CardHeader><CardTitle>AI scope analysis <StatusBadge status={d.aiClassification} /></CardTitle></CardHeader>
                <CardContent className="grid gap-1 text-sm">
                  <p className="whitespace-pre-wrap">{d.aiRationale}</p>
                  {(d.aiMatchedItems ?? []).length > 0 && (
                    <ul className="list-disc pl-5">{(d.aiMatchedItems ?? []).map((m: any, i: number) => <li key={i}>{m.title} — {m.reason}</li>)}</ul>
                  )}
                  {d.aiImpact && <pre className="overflow-auto rounded bg-warm-50 p-2 text-xs">{JSON.stringify(d.aiImpact, null, 2)}</pre>}
                  {(d.aiSuggestedRequirements ?? []).length > 0 && (
                    <div>
                      <p className="font-medium">Suggested requirements</p>
                      <ul className="list-disc pl-5">{(d.aiSuggestedRequirements ?? []).map((s: any, i: number) => <li key={i}>{s.title}</li>)}</ul>
                    </div>
                  )}
                  <p className="text-xs text-warm-500">AI suggests — the PM&apos;s classification is final.</p>
                </CardContent>
              </Card>
            )}
            {(d.tasks ?? []).length > 0 && (
              <p className="text-xs text-warm-600">Linked tasks: {(d.tasks ?? []).map((t: any) => `${t.code} (${t.status})`).join(", ")}</p>
            )}
            {(d.status === "PENDING" || d.status === "UNDER_REVIEW") && (
              <div className="flex gap-2">
                <Button onClick={() => setDecision({ id: d.id, kind: "approve" })}>Approve…</Button>
                <Button variant="outline" onClick={() => setDecision({ id: d.id, kind: "reject" })}>Reject…</Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
      <Dialog open={!!decision && decision.kind === "approve"} onClose={() => setDecision(null)} title="Approve change request">
        <div className="grid gap-2 text-sm">
          <div>
            <Label>Final classification (PM verdict — final)</Label>
            <Select value={finalClassification} onChange={(e) => setFinalClassification(e.target.value)}>
              <option value="IN_SCOPE">In scope</option>
              <option value="OUT_OF_SCOPE">Out of scope</option>
              <option value="POSSIBLY_RELATED">Possibly related</option>
            </Select>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={createVersion} onChange={(e) => setCreateVersion(e.target.checked)} />
            Create/propose scope v(n+1) draft (uncheck for pure in-scope work)
          </label>
          {createVersion && (
            <div>
              <Label htmlFor="nf-title">New feature title for v(n+1)</Label>
              <Input id="nf-title" value={newFeatureTitle} onChange={(e) => setNewFeatureTitle(e.target.value)} placeholder="e.g. Wishlist page" />
            </div>
          )}
          <div>
            <Label htmlFor="ap-note">Note</Label>
            <Textarea id="ap-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button disabled={approve.isPending} onClick={() => decision && approve.mutate({ id: decision.id })}>Confirm approval</Button>
        </div>
      </Dialog>
      <Dialog open={!!decision && decision.kind === "reject"} onClose={() => setDecision(null)} title="Reject change request">
        <div className="grid gap-2">
          <Label htmlFor="rj-reason">Reason (required, sent to client)</Label>
          <Textarea id="rj-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button variant="destructive" disabled={!reason.trim() || reject.isPending} onClick={() => decision && reject.mutate({ id: decision.id })}>Reject</Button>
        </div>
      </Dialog>
    </div>
  );
}
