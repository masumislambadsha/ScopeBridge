"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { useState } from "react";

export default function MyTasksPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-tasks", status],
    queryFn: () => api.get<any[]>(`/api/tasks/mine?limit=100${status ? `&status=${status}` : ""}`).then((r) => r.data),
  });
  const move = useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) => api.patch(`/api/tasks/${id}`, { status: to }),
    onSuccess: () => {
      toast.success("Task updated");
      void qc.invalidateQueries({ queryKey: ["my-tasks"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });

  return (
    <AgencyGuard>
      <AgencyShell>
        <PageHeader title="My tasks" />
        <Select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="TODO">Todo</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="REVIEW">Review</option>
          <option value="COMPLETED">Completed</option>
        </Select>
        <div className="mt-3">
          {isLoading && <ListSkeleton />}
          {error && <ErrorState message="Could not load tasks." onRetry={() => refetch()} />}
          {data && data.length === 0 && <EmptyState title="No tasks assigned" />}
          <div className="grid gap-2">
            {data?.map((t: any) => (
              <Card key={t.id}>
                <CardContent className="flex flex-col gap-1 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="font-medium"><span className="font-mono text-xs text-warm-500">{t.code}</span> {t.title}</p>
                    <p className="text-xs text-warm-500">{t.requirement ? `${t.requirement.code} · ` : ""}{t.priority}</p>
                  </div>
                  <Select aria-label="Move task" value={t.status} onChange={(e) => move.mutate({ id: t.id, to: e.target.value })}>
                    <option value="TODO">Todo</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="REVIEW">Review</option>
                    <option value="COMPLETED">Completed</option>
                  </Select>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AgencyShell>
    </AgencyGuard>
  );
}
