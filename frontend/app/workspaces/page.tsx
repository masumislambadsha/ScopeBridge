"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";

const schema = z.object({ name: z.string().min(1, "Name required"), description: z.string().optional() });

export default function WorkspacesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["workspaces", page],
    queryFn: () => api.get<any[]>(`/api/workspaces?page=${page}&limit=20`).then((r) => ({ items: r.data, meta: r.meta! })),
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const create = useMutation({
    mutationFn: (v: z.infer<typeof schema>) => api.post("/api/workspaces", v),
    onSuccess: () => {
      toast.success("Workspace created");
      form.reset();
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Create failed"),
  });

  return (
    <AgencyGuard>
      <AgencyShell>
        <PageHeader title="Workspaces" />
        <Card><CardContent>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="name">New workspace name</Label>
              <Input id="name" {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <Button type="submit" disabled={create.isPending}>Create</Button>
          </form>
        </CardContent></Card>
        <div className="mt-3">
          {isLoading && <ListSkeleton />}
          {error && <ErrorState message="Could not load workspaces." onRetry={() => refetch()} />}
          {data && data.items.length === 0 && <EmptyState title="No workspaces" hint="Create your first workspace above." />}
          <div className="grid gap-2">
            {data?.items.map((w: any) => (
              <Card key={w.id}>
                <CardContent className="flex items-center justify-between gap-2">
                  <div><p className="font-medium">{w.name}</p><p className="text-xs text-zinc-500">{w.role}</p></div>
                  <a href={`/workspaces/${w.id}/members`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50">Members</a>
                </CardContent>
              </Card>
            ))}
          </div>
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </div>
      </AgencyShell>
    </AgencyGuard>
  );
}
