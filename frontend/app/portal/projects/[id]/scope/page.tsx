"use client";
import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { PortalShell } from "@/components/shells/portal-shell";
import { PortalGuard } from "@/components/shells/guards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

export default function PortalScopePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [versionId, setVersionId] = useState<string | null>(null);
  const [decide, setDecide] = useState<null | { approvalId: string; kind: "approve" | "reject" | "changes" }>(null);
  const [comment, setComment] = useState("");
  const [signature, setSignature] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["portal-project", id, "scope"],
    queryFn: () => api.get<any>(`/api/portal/projects/${id}`).then((r) => r.data),
  });

  const inv = () => {
    void qc.invalidateQueries({ queryKey: ["portal-project"] });
  };
  const act = useMutation({
    mutationFn: ({ approvalId, kind }: { approvalId: string; kind: "approve" | "reject" | "request-changes" }) =>
      api.post(`/api/approvals/${approvalId}/${kind}`, { comment: comment || undefined, signatureName: signature }),
    onSuccess: (_, v) => {
      toast.success(v.kind === "approve" ? "Scope approved — thank you" : "Response recorded");
      setDecide(null);
      setComment("");
      setSignature("");
      inv();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const versions = (data?.scopeVersions ?? []) as any[];
  const current = versions.find((v) => v.id === versionId) ?? versions[0] ?? null;
  const pending = (data?.approvals ?? []).filter((a: any) => a.status === "PENDING");

  return (
    <PortalGuard>
      <PortalShell>
        <PageHeader title="Scope" hint="Review each version, then approve, reject, or request changes." />
        {isLoading && <ListSkeleton rows={3} />}
        {error && <ErrorState message="Could not load scope." onRetry={() => refetch()} />}
        {data && versions.length === 0 && <EmptyState title="No scope shared yet" hint="Your agency will share the first version for approval soon." />}
        {data && versions.length > 0 && (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="pv">Version</Label>
              <Select id="pv" value={current?.id ?? ""} onChange={(e) => setVersionId(e.target.value)}>
                {versions.map((v: any) => <option key={v.id} value={v.id}>v{v.version} — {v.status}</option>)}
              </Select>
            </div>
            {pending.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Awaiting your decision</CardTitle></CardHeader>
                <CardContent className="grid gap-2">
                  {pending.map((a: any) => (
                    <div key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span>Scope v{a.scopeVersion?.version}</span>
                      <Button size="sm" onClick={() => setDecide({ approvalId: a.id, kind: "approve" })}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => setDecide({ approvalId: a.id, kind: "reject" })}>Reject</Button>
                      <Button size="sm" variant="outline" onClick={() => setDecide({ approvalId: a.id, kind: "changes" })}>Request changes</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {current && (
              <Card>
                <CardHeader><CardTitle>v{current.version} <StatusBadge status={current.status} /></CardTitle></CardHeader>
                <CardContent className="grid gap-2">
                  <div>
                    <p className="font-medium">Features</p>
                    <ul className="grid gap-1">
                      {(current.features ?? []).map((f: any) => (
                        <li key={f.id} className="rounded border p-2 text-sm">
                          <p className="font-medium">{f.title}</p>
                          <p className="text-warm-600">{f.description}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid gap-1 text-sm sm:grid-cols-2">
                    <div><p className="font-medium">Deliverables</p><ul className="list-disc pl-5">{(current.deliverables ?? []).map((d: string, i: number) => <li key={i}>{d}</li>)}</ul></div>
                    <div><p className="font-medium">Exclusions</p><ul className="list-disc pl-5">{(current.exclusions ?? []).map((d: string, i: number) => <li key={i}>{d}</li>)}</ul></div>
                  </div>
                </CardContent>
              </Card>
            )}
            {(data.approvals ?? []).filter((a: any) => a.status !== "PENDING").length > 0 && (
              <Card>
                <CardHeader><CardTitle>Decision history</CardTitle></CardHeader>
                <CardContent>
                  <ul className="grid gap-1 text-sm">
                    {(data.approvals ?? []).filter((a: any) => a.status !== "PENDING").map((a: any) => (
                      <li key={a.id}><StatusBadge status={a.status} /> v{a.scopeVersion?.version} — {a.signatureName ?? ""} {a.decidedAt ? new Date(a.decidedAt).toLocaleString() : ""}{a.comment ? ` — “${a.comment}”` : ""}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        <Dialog
          open={!!decide}
          onClose={() => setDecide(null)}
          title={decide?.kind === "approve" ? "Approve scope" : decide?.kind === "reject" ? "Reject scope" : "Request changes"}
        >
          <div className="grid gap-2">
            {decide?.kind !== "approve" && (
              <div>
                <Label htmlFor="dec-comment">Comment (required)</Label>
                <Textarea id="dec-comment" value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
            )}
            {decide?.kind === "approve" && (
              <div>
                <Label htmlFor="dec-comment-o">Comment (optional)</Label>
                <Textarea id="dec-comment-o" value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
            )}
            <div>
              <Label htmlFor="dec-sign">Type your full name as signature (required)</Label>
              <Input id="dec-sign" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Jane Cooper" />
            </div>
            <Button
              disabled={!signature.trim() || (decide?.kind !== "approve" && !comment.trim()) || act.isPending}
              onClick={() => decide && act.mutate({ approvalId: decide.approvalId, kind: decide.kind === "changes" ? "request-changes" : decide.kind })}
            >
              Confirm
            </Button>
          </div>
        </Dialog>
      </PortalShell>
    </PortalGuard>
  );
}
