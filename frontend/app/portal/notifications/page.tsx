"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { api, ApiError } from "@/lib/api";
import { PortalShell } from "@/components/shells/portal-shell";
import { PortalGuard } from "@/components/shells/guards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";

export default function PortalNotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["notifications", "portal-page"],
    queryFn: () => api.get<any[]>("/api/notifications?limit=50").then((r) => ({ items: r.data, unread: r.meta?.unreadCount ?? 0 })),
  });
  const readAll = useMutation({
    mutationFn: () => api.patch("/api/notifications/read-all", {}),
    onSuccess: () => {
      toast.success("All marked read");
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });
  const read = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <PortalGuard>
      <PortalShell>
        <PageHeader title="Notifications" hint={data ? `${data.unread} unread` : undefined} actions={<Button variant="outline" size="sm" onClick={() => readAll.mutate()}>Mark all read</Button>} />
        {isLoading && <ListSkeleton />}
        {error && <ErrorState message="Could not load notifications." onRetry={() => refetch()} />}
        {data && data.items.length === 0 && <EmptyState title="All caught up" />}
        <div className="grid gap-2">
          {data?.items.map((n: any) => (
            <Card key={n.id} className={n.read ? "opacity-70" : ""}>
              <CardContent className="flex flex-col gap-1 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="text-sm text-zinc-600">{n.body}</p>}
                  <p className="text-xs text-zinc-500">{format(new Date(n.createdAt), "MMM d, yyyy HH:mm")}</p>
                </div>
                {n.link && <a href={n.link} className="text-sm underline">Open</a>}
                {!n.read && <Button size="sm" variant="outline" onClick={() => read.mutate(n.id)}>Mark read</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      </PortalShell>
    </PortalGuard>
  );
}
