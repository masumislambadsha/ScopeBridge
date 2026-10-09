"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { ListSkeleton, EmptyState, ErrorState, AiDraftLabel } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";

interface Feature {
  id: string;
  title: string;
  description: string;
  priority: string;
  requirementIds: string[];
  acceptanceCriteria: Array<{ given: string; when: string; then: string }>;
}

export function ScopeTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [versionId, setVersionId] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [compareTo, setCompareTo] = useState("");
  const [sendId, setSendId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [deliverables, setDeliverables] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [replaceCriteria, setReplaceCriteria] = useState(false);

  const scopeQ = useQuery({
    queryKey: ["scope", projectId],
    queryFn: () => api.get<any>(`/api/scopes?projectId=${projectId}`).then((r) => r.data[0] ?? null),
  });
  const scope = scopeQ.data;
  const versions = (scope?.versions ?? []) as any[];
  const current = versions.find((v) => v.id === versionId) ?? versions[0] ?? null;

  const versionQ = useQuery({
    queryKey: ["scope-version", current?.id],
    queryFn: () => api.get<any>(`/api/scope-versions/${current.id}`).then((r) => r.data),
    enabled: !!current,
  });

  const reqs = useQuery({
    queryKey: ["requirements", projectId, "scope"],
    queryFn: () => api.get<any[]>(`/api/requirements?projectId=${projectId}&limit=100`).then((r) => r.data),
  });

  const cmp = useQuery({
    queryKey: ["scope-compare", current?.id, compareTo],
    queryFn: () => api.get<any>(`/api/scopes/${scope.id}/compare?from=${compareTo}&to=${current.id}`).then((r) => r.data),
    enabled: compare && !!compareTo && !!current,
  });

  const inv = () => {
    void qc.invalidateQueries({ queryKey: ["scope", projectId] });
    void qc.invalidateQueries({ queryKey: ["scope-version"] });
    void qc.invalidateQueries({ queryKey: ["scope-versions"] });
    void qc.invalidateQueries({ queryKey: ["traceability", projectId] });
  };

  const createScope = useMutation({
    mutationFn: () => api.post("/api/scopes", { projectId }),
    onSuccess: () => {
      toast.success("Scope + v1 draft created");
      inv();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Create failed"),
  });
  const newVersion = useMutation({
    mutationFn: () => api.post(`/api/scopes/${scope.id}/versions`, {}),
    onSuccess: (r: any) => {
      toast.success(`Draft v${r.data.version} created`);
      setVersionId(r.data.id);
      inv();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Create failed"),
  });
  const save = useMutation({
    mutationFn: () =>
      api.patch(`/api/scope-versions/${current.id}`, {
        features,
        deliverables: deliverables.split("\n").map((s) => s.trim()).filter(Boolean),
        exclusions: exclusions.split("\n").map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      toast.success("Draft saved");
      setEditing(false);
      inv();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Save failed"),
  });
  const genCriteria = useMutation({
    mutationFn: () => api.post(`/api/ai/acceptance-criteria`, { scopeVersionId: current.id, replace: replaceCriteria }),
    onSuccess: (r: any) => toast.success(`Criteria generation queued (${r.data.aiRunId.slice(0, 8)}…) — refresh shortly`),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Queue failed"),
  });
  const send = useMutation({
    mutationFn: (id: string) => api.post(`/api/scopes/${scope.id}/request-approval`, { scopeVersionId: id }),
    onSuccess: () => {
      toast.success("Sent to client for approval");
      inv();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Send failed"),
  });

  function startEdit() {
    const v = versionQ.data;
    setFeatures((v?.features ?? []).map((f: any) => ({ ...f })));
    setDeliverables(((v?.deliverables ?? []) as string[]).join("\n"));
    setExclusions(((v?.exclusions ?? []) as string[]).join("\n"));
    setEditing(true);
  }

  function addFeature(reqId?: string) {
    setFeatures([...features, { id: `f${Date.now()}`, title: "", description: "", priority: "MEDIUM", requirementIds: reqId ? [reqId] : [], acceptanceCriteria: [] }]);
  }

  return (
    <div className="grid gap-3">
      {scopeQ.isLoading && <ListSkeleton />}
      {scopeQ.error && <ErrorState message="Could not load scope." onRetry={() => scopeQ.refetch()} />}
      {scopeQ.data === null && <EmptyState title="No scope yet" hint="Create the scope to start the v1 draft." action={<Button onClick={() => createScope.mutate()} disabled={createScope.isPending}>Create scope</Button>} />}
      {scope && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="scope-version">Version</Label>
            <Select id="scope-version" value={current?.id ?? ""} onChange={(e) => { setVersionId(e.target.value); setEditing(false); }}>
              {versions.map((v: any) => <option key={v.id} value={v.id}>v{v.version} — {v.status}</option>)}
            </Select>
            <Button size="sm" variant="outline" onClick={() => newVersion.mutate()} disabled={newVersion.isPending}>New draft version</Button>
            <Button size="sm" variant="outline" onClick={() => setCompare(!compare)}>{compare ? "Hide compare" : "Compare"}</Button>
            {compare && (
              <Select aria-label="Compare from" value={compareTo} onChange={(e) => setCompareTo(e.target.value)}>
                <option value="">From…</option>
                {versions.filter((v: any) => v.id !== current?.id).map((v: any) => <option key={v.id} value={v.id}>v{v.version}</option>)}
              </Select>
            )}
          </div>
          {compare && cmp.data && (
            <Card>
              <CardHeader><CardTitle>Diff v{cmp.data.from.version} → v{cmp.data.to.version}</CardTitle></CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p><b>Added:</b> {(cmp.data.features.added ?? []).map((f: any) => f.title).join(", ") || "—"}</p>
                <p><b>Removed:</b> {(cmp.data.features.removed ?? []).map((f: any) => f.title).join(", ") || "—"}</p>
                <p><b>Modified:</b> {(cmp.data.features.modified ?? []).length}</p>
                <p><b>Deliverables +:</b> {(cmp.data.deliverables.added ?? []).join(", ") || "—"} <b>−:</b> {(cmp.data.deliverables.removed ?? []).join(", ") || "—"}</p>
                <p><b>Exclusions +:</b> {(cmp.data.exclusions.added ?? []).join(", ") || "—"} <b>−:</b> {(cmp.data.exclusions.removed ?? []).join(", ") || "—"}</p>
              </CardContent>
            </Card>
          )}
          {versionQ.isLoading && <ListSkeleton rows={3} />}
          {versionQ.data && !editing && (
            <Card>
              <CardHeader><CardTitle>v{versionQ.data.version} <StatusBadge status={versionQ.data.status} /></CardTitle></CardHeader>
              <CardContent className="grid gap-3">
                <div>
                  <p className="font-medium">Features ({(versionQ.data.features ?? []).length})</p>
                  <ul className="grid gap-2">
                    {((versionQ.data.features ?? []) as Feature[]).map((f) => (
                      <li key={f.id} className="rounded border p-2 text-sm">
                        <p className="font-medium">{f.title} <StatusBadge status={f.priority} /></p>
                        <p className="text-zinc-600">{f.description}</p>
                        {(f.acceptanceCriteria ?? []).length > 0 && (
                          <ul className="mt-1 list-disc pl-5 text-xs text-zinc-600">
                            {f.acceptanceCriteria.map((c, i) => <li key={i}>Given {c.given}, when {c.when}, then {c.then}</li>)}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-1 text-sm sm:grid-cols-2">
                  <div><p className="font-medium">Deliverables</p><ul className="list-disc pl-5">{((versionQ.data.deliverables ?? []) as string[]).map((d, i) => <li key={i}>{d}</li>)}</ul></div>
                  <div><p className="font-medium">Exclusions</p><ul className="list-disc pl-5">{((versionQ.data.exclusions ?? []) as string[]).map((d, i) => <li key={i}>{d}</li>)}</ul></div>
                </div>
                {versionQ.data.status === "DRAFT" && (
                  <div className="sticky bottom-2 flex flex-wrap gap-2 rounded-lg border bg-white p-2 shadow">
                    <Button onClick={startEdit}>Edit draft</Button>
                    <Button variant="outline" onClick={() => genCriteria.mutate()} disabled={genCriteria.isPending}>Generate acceptance criteria (AI)</Button>
                    <label className="flex items-center gap-1 text-xs text-zinc-600">
                      <input type="checkbox" checked={replaceCriteria} onChange={(e) => setReplaceCriteria(e.target.checked)} /> replace reviewed
                    </label>
                    <Button variant="outline" onClick={() => setSendId(versionQ.data.id)}>Send for approval</Button>
                  </div>
                )}
                {(versionQ.data.approvals ?? []).length > 0 && (
                  <div>
                    <p className="font-medium">Approval history</p>
                    <ul className="grid gap-1 text-sm">
                      {versionQ.data.approvals.map((a: any) => (
                        <li key={a.id}><StatusBadge status={a.status} /> {a.signatureName ?? ""} {a.decidedAt ? new Date(a.decidedAt).toLocaleString() : ""} {a.comment ? `— “${a.comment}”` : ""}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {editing && (
            <Card>
              <CardHeader><CardTitle>Editing draft v{versionQ.data?.version}</CardTitle></CardHeader>
              <CardContent className="grid gap-3">
                <div>
                  <p className="mb-1 text-sm font-medium">Build from requirements</p>
                  <div className="flex flex-wrap gap-1">
                    {(reqs.data ?? []).filter((r: any) => ["READY", "APPROVED"].includes(r.status)).map((r: any) => (
                      <button key={r.id} className="rounded-full border px-2 py-1 text-xs hover:bg-zinc-50" onClick={() => addFeature(r.id)}>
                        + {r.code} {r.title.slice(0, 30)}
                      </button>
                    ))}
                  </div>
                </div>
                {features.map((f, i) => (
                  <div key={f.id} className="grid gap-1 rounded border p-2">
                    <div className="grid gap-1 sm:grid-cols-2">
                      <Input aria-label="Feature title" placeholder="Feature title" value={f.title} onChange={(e) => setFeatures(features.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                      <Select aria-label="Priority" value={f.priority} onChange={(e) => setFeatures(features.map((x, j) => j === i ? { ...x, priority: e.target.value } : x))}>
                        <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
                      </Select>
                    </div>
                    <Textarea aria-label="Feature description" placeholder="Description" value={f.description} onChange={(e) => setFeatures(features.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                    {(f.acceptanceCriteria ?? []).length > 0 && <AiDraftLabel />}
                    <button className="justify-self-start text-xs text-red-600 underline" onClick={() => setFeatures(features.filter((_, j) => j !== i))}>remove feature</button>
                  </div>
                ))}
                <Button variant="outline" onClick={() => addFeature()}>Add blank feature</Button>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><Label>Deliverables (one per line)</Label><Textarea value={deliverables} onChange={(e) => setDeliverables(e.target.value)} /></div>
                  <div><Label>Exclusions (one per line)</Label><Textarea value={exclusions} onChange={(e) => setExclusions(e.target.value)} /></div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => save.mutate()} disabled={save.isPending}>Save draft</Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <ConfirmDialog open={!!sendId} onClose={() => setSendId(null)} onConfirm={() => sendId && send.mutate(sendId)} title="Send for client approval?" body="The version freezes as PENDING_APPROVAL and the client is notified." confirmLabel="Send" />
          <p className="text-xs text-zinc-500">Approval history: <Link className="underline" href={`/projects/${projectId}/scope/compare`}>version compare page</Link></p>
        </>
      )}
    </div>
  );
}
