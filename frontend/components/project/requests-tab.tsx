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
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  deadline: z.string().optional(),
});

type Q = { id: string; question: string; answerType: string; options: string[]; required: boolean };

export function RequestsTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState("text");
  const [suggesting, setSuggesting] = useState(false);
  const [sendId, setSendId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["information-requests", projectId],
    queryFn: () => api.get<any[]>(`/api/information-requests?projectId=${projectId}&limit=50`).then((r) => r.data),
  });

  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const create = useMutation({
    mutationFn: (v: z.infer<typeof schema>) =>
      api.post("/api/information-requests", { ...v, projectId, questions: questions.map((q, i) => ({ ...q, id: q.id || `q${i + 1}` })) }),
    onSuccess: () => {
      toast.success("Information request created");
      form.reset();
      setQuestions([]);
      void qc.invalidateQueries({ queryKey: ["information-requests", projectId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Create failed"),
  });
  const send = useMutation({
    mutationFn: (id: string) => api.post(`/api/information-requests/${id}/send`, {}),
    onSuccess: () => {
      toast.success("Sent to client by email + app");
      void qc.invalidateQueries({ queryKey: ["information-requests", projectId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Send failed"),
  });

  async function suggest() {
    setSuggesting(true);
    try {
      const r = await api.post<any>("/api/ai/checklist", { projectId });
      const items: Q[] = [];
      for (const s of r.data.sections ?? []) {
        for (const it of s.items ?? []) {
          items.push({ id: `s${items.length + 1}`, question: it.question, answerType: it.answerType ?? "text", options: it.options ?? [], required: !!it.required });
        }
      }
      setQuestions(items);
      toast.success(`AI suggested ${items.length} questions (${r.data.source}) — review and keep what fits`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Suggestion failed");
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Card>
        <CardHeader><CardTitle>New information request</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="ir-title">Title</Label>
              <Input id="ir-title" {...form.register("title")} />
            </div>
            <div>
              <Label htmlFor="ir-deadline">Deadline</Label>
              <Input id="ir-deadline" type="date" {...form.register("deadline")} />
            </div>
          </div>
          <div>
            <Label htmlFor="ir-desc">Description</Label>
            <Textarea id="ir-desc" {...form.register("description")} />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="q-text">Question</Label>
              <Input id="q-text" value={qText} onChange={(e) => setQText(e.target.value)} placeholder="e.g. What are the must-have features?" />
            </div>
            <Select aria-label="Answer type" value={qType} onChange={(e) => setQType(e.target.value)}>
              <option value="text">Text</option>
              <option value="longtext">Long text</option>
              <option value="select">Select</option>
              <option value="file">File</option>
            </Select>
            <Button type="button" variant="outline" onClick={() => { if (qText.trim()) { setQuestions([...questions, { id: `q${questions.length + 1}`, question: qText.trim(), answerType: qType, options: [], required: false }]); setQText(""); } }}>
              Add
            </Button>
            <Button type="button" variant="outline" onClick={suggest} disabled={suggesting}>
              {suggesting ? "Suggesting…" : "AI suggest questions"}
            </Button>
          </div>
          {questions.length > 0 && (
            <ul className="grid gap-1 text-sm">
              {questions.map((q, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                  <span>{q.question} <span className="text-xs text-zinc-500">[{q.answerType}]</span></span>
                  <button className="text-xs text-red-600 underline" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>remove</button>
                </li>
              ))}
            </ul>
          )}
          <div>
            <Button disabled={create.isPending || questions.length === 0} onClick={form.handleSubmit((v) => create.mutate(v))}>
              Create request ({questions.length} questions)
            </Button>
          </div>
        </CardContent>
      </Card>
      {isLoading && <ListSkeleton />}
      {error && <ErrorState message="Could not load requests." onRetry={() => refetch()} />}
      {data && data.length === 0 && <EmptyState title="No requests yet" />}
      <div className="grid gap-2">
        {data?.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-1 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-zinc-500">{(r.questions ?? []).length} questions · {r.type}{r.deadline ? ` · due ${new Date(r.deadline).toLocaleDateString()}` : ""}</p>
              </div>
              <StatusBadge status={r.status} />
              {r.status === "DRAFT" && <Button size="sm" onClick={() => setSendId(r.id)}>Send</Button>}
            </CardContent>
          </Card>
        ))}
      </div>
      <ConfirmDialog open={!!sendId} onClose={() => setSendId(null)} onConfirm={() => sendId && send.mutate(sendId)} title="Send to client?" body="The client is notified in-app and by email." confirmLabel="Send" />
    </div>
  );
}
