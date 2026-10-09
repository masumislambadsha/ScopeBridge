"use client";
import { useState } from "react";
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

export default function PortalMessagesPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["portal-messages", params.id],
    queryFn: () => api.get<any[]>(`/api/messages?projectId=${params.id}&limit=50`).then((r) => r.data),
  });
  const send = useMutation({
    mutationFn: () => api.post("/api/messages", { projectId: params.id, content: text }),
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["portal-messages", params.id] });
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
            <Textarea aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write to your agency…" />
            <div><Button disabled={!text.trim() || send.isPending} onClick={() => send.mutate()}>Send</Button></div>
          </CardContent>
        </Card>
        {isLoading && <ListSkeleton rows={3} />}
        {error && <ErrorState message="Could not load messages." onRetry={() => refetch()} />}
        {data && items.length === 0 && <EmptyState title="No messages yet" />}
        <ul className="grid gap-1">
          {items.map((m: any) => (
            <li key={m.id} className="rounded-2xl border bg-white p-2 text-sm">
              <p className="text-xs text-warm-500">{m.sender?.name} · {new Date(m.createdAt).toLocaleString()}</p>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </li>
          ))}
        </ul>
      </PortalShell>
    </PortalGuard>
  );
}
