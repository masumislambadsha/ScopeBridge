"use client";
import { use, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { PortalShell } from "@/components/shells/portal-shell";
import { PortalGuard } from "@/components/shells/guards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";

export default function PortalMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  // Edit sequence: a late onSuccess must never wipe text typed after submit.
  const seq = useRef(0);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["portal-messages", id],
    queryFn: () => api.get<any[]>(`/api/messages?projectId=${id}&limit=50`).then((r) => r.data),
  });
  const send = useMutation({
    mutationFn: async () => {
      const mySeq = ++seq.current;
      const res = await api.post("/api/messages", { projectId: id, content: text });
      return { res, mySeq };
    },
    onSuccess: ({ mySeq }) => {
      // Only clear when nothing newer was typed while the request was in flight.
      if (mySeq === seq.current) setText("");
      void qc.invalidateQueries({ queryKey: ["portal-messages", id] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Send failed"),
  });
  const items = [...(data ?? [])].reverse();

  return (
    <PortalGuard>
      <PortalShell>
        <PageHeader title="Messages" />
        <Card>
          <CardContent className="grid gap-2">
            <Textarea aria-label="Message" value={text} onChange={(e) => { seq.current++; setText(e.target.value); }} placeholder="Write to your agency…" />
            <div><Button disabled={!text.trim() || send.isPending} onClick={() => send.mutate()}>Send</Button></div>
          </CardContent>
        </Card>
        {isLoading && <ListSkeleton rows={3} />}
        {error && <ErrorState message="Could not load messages." onRetry={() => refetch()} />}
        {data && items.length === 0 && <EmptyState title="No messages yet" />}
        <ul className="grid gap-1">
          {items.map((m: any) => (
            <li key={m.id} className="rounded-lg border bg-white p-2 text-sm">
              <p className="text-xs text-zinc-500">{m.sender?.name} · {new Date(m.createdAt).toLocaleString()}</p>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </li>
          ))}
        </ul>
      </PortalShell>
    </PortalGuard>
  );
}
