"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError, DIRECT_API, getAccessToken } from "@/lib/api";
import { PortalShell } from "@/components/shells/portal-shell";
import { PortalGuard } from "@/components/shells/guards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, ErrorState } from "@/components/ui/states";

export default function PortalAnswerPage({ params }: { params: { id: string; requestId: string } }) {
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["portal-request", params.requestId],
    queryFn: () => api.get<any>(`/api/information-requests/${params.requestId}`).then((r) => r.data),
  });

  const submit = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("projectId", params.id);
      fd.append("informationRequestId", params.requestId);
      fd.append("answers", JSON.stringify(answers));
      if (extra.trim()) fd.append("additionalInfo", extra.trim());
      for (const f of files.slice(0, 10)) fd.append("files", f);
      // Multipart goes direct to the API (no Next.js proxy body limits, §3.3).
      const headers: Record<string, string> = {};
      const t = getAccessToken();
      if (t) headers.Authorization = `Bearer ${t}`;
      const res = await fetch(`${DIRECT_API}/api/submissions`, { method: "POST", headers, body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new ApiError(res.status, json?.error?.code ?? "INTERNAL", json?.error?.message ?? "Submit failed");
      return json;
    },
    onSuccess: () => {
      toast.success("Answers submitted — thank you");
      void qc.invalidateQueries({ queryKey: ["portal-project", params.id] });
      void qc.invalidateQueries({ queryKey: ["portal-projects"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Submit failed"),
  });

  return (
    <PortalGuard>
      <PortalShell>
        {isLoading && <ListSkeleton rows={4} />}
        {error && <ErrorState message="Could not load request." onRetry={() => refetch()} />}
        {data && (
          <>
            <PageHeader title={data.title} hint={data.description ?? ""} />
            <div className="grid gap-3">
              <Card>
                <CardHeader><CardTitle>Your answers</CardTitle></CardHeader>
                <CardContent className="grid gap-3">
                  {(data.questions ?? []).map((q: any) => (
                    <div key={q.id}>
                      <Label htmlFor={`q-${q.id}`}>{q.question}{q.required ? " *" : ""}</Label>
                      {q.answerType === "longtext" ? (
                        <Textarea id={`q-${q.id}`} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                      ) : q.answerType === "select" ? (
                        <Select id={`q-${q.id}`} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}>
                          <option value="">Choose…</option>
                          {(q.options ?? []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                        </Select>
                      ) : q.answerType === "file" ? (
                        <p className="text-xs text-zinc-500">Attach files below for this question.</p>
                      ) : (
                        <Input id={`q-${q.id}`} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                      )}
                    </div>
                  ))}
                  <div>
                    <Label htmlFor="extra">Anything else to add?</Label>
                    <Textarea id="extra" value={extra} onChange={(e) => setExtra(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="files">Files (up to 10, 10 MB each: PDF, DOC, DOCX, PNG, JPG, WEBP, TXT)</Label>
                    <Input id="files" type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                    {files.length > 0 && <p className="text-xs text-zinc-500">{files.length} file(s) selected</p>}
                  </div>
                  <div><Button disabled={submit.isPending} onClick={() => submit.mutate()}>Submit answers</Button></div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </PortalShell>
    </PortalGuard>
  );
}
