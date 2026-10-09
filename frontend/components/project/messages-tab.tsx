"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { useAuth } from "@/lib/auth";

export function MessagesTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<"CLIENT" | "INTERNAL">("CLIENT");
  const [before, setBefore] = useState<string | null>(null);

  const msgs = useQuery({
    queryKey: ["messages", projectId, before],
    queryFn: () =>
      api
        .get<any[]>(`/api/messages?projectId=${projectId}&limit=30${before ? `&before=${encodeURIComponent(before)}` : ""}`)
        .then((r) => ({ items: r.data, meta: r.meta! })),
  });

  const send = useMutation({
    mutationFn: () => api.post("/api/messages", { projectId, content: text, visibility }),
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["messages", projectId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Send failed"),
  });

  const items = [...(msgs.data?.items ?? [])].reverse();
  const canInternal = session && !session.isClientOnly;

  return (
    <div className="grid gap-3">
      <Card>
        <CardContent className="grid gap-2">
          <Textarea aria-label="Message" placeholder="Write a message…" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex items-center gap-2">
            {canInternal && (
              <select aria-label="Visibility" className="h-9 rounded-md border border-zinc-300 px-2 text-sm" value={visibility} onChange={(e) => setVisibility(e.target.value as "CLIENT" | "INTERNAL")}>
                <option value="CLIENT">Client-visible</option>
                <option value="INTERNAL">Internal (agency only)</option>
              </select>
            )}
            <Button disabled={!text.trim() || send.isPending} onClick={() => send.mutate()}>Send</Button>
          </div>
        </CardContent>
      </Card>
      {msgs.isLoading && <ListSkeleton rows={3} />}
      {msgs.error && <ErrorState message="Could not load messages." onRetry={() => msgs.refetch()} />}
      {msgs.data && items.length === 0 && <EmptyState title="No messages yet" />}
      <ul className="grid gap-1">
        {items.map((m: any) => (
          <li key={m.id} className={`max-w-[85%] rounded-lg border p-2 text-sm ${m.sender?.id === session?.user.id ? "ml-auto bg-zinc-900 text-white" : "bg-white"}`}>
            <p className={`text-xs ${m.sender?.id === session?.user.id ? "text-zinc-300" : "text-zinc-500"}`}>
              {m.sender?.name} · {new Date(m.createdAt).toLocaleString()}
              {m.visibility === "INTERNAL" && " · internal"}
            </p>
            <p className="whitespace-pre-wrap">{m.content}</p>
          </li>
        ))}
      </ul>
      {msgs.data && msgs.data.meta.total > items.length && (
        <Button
          variant="outline"
          onClick={() => {
            const oldest = items[0];
            if (oldest) setBefore(oldest.createdAt);
          }}
        >
          Load older
        </Button>
      )}
    </div>
  );
}
