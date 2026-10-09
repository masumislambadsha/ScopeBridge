"use client";
import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { PortalShell } from "@/components/shells/portal-shell";
import { PortalGuard } from "@/components/shells/guards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";

const schema = z.object({ title: z.string().min(1, "Title required"), description: z.string().min(1, "Describe the change") });

export default function PortalChangeRequestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["portal-project", id, "crs"],
    queryFn: () => api.get<any>(`/api/portal/projects/${id}`).then((r) => r.data),
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const create = useMutation({
    mutationFn: (v: z.infer<typeof schema>) => api.post("/api/change-requests", { projectId: id, ...v }),
    onSuccess: () => {
      toast.success("Change request submitted — your agency will review it");
      form.reset();
      void qc.invalidateQueries({ queryKey: ["portal-project"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Submit failed"),
  });

  return (
    <PortalGuard>
      <PortalShell>
        <PageHeader title="Change requests" hint="Ask for something new — it is analyzed against the approved scope first." />
        <Card>
          <CardHeader><CardTitle>Request a change</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-2">
              <div>
                <Label htmlFor="cr-title">Title</Label>
                <Input id="cr-title" {...form.register("title")} />
                <FieldError message={form.formState.errors.title?.message} />
              </div>
              <div>
                <Label htmlFor="cr-desc">Description</Label>
                <Textarea id="cr-desc" {...form.register("description")} />
                <FieldError message={form.formState.errors.description?.message} />
              </div>
              <div><Button type="submit" disabled={create.isPending}>Submit request</Button></div>
            </form>
          </CardContent>
        </Card>
        {isLoading && <ListSkeleton />}
        {error && <ErrorState message="Could not load change requests." onRetry={() => refetch()} />}
        {data && data.changeRequests.length === 0 && <EmptyState title="No change requests" />}
        <div className="grid gap-2">
          {data?.changeRequests.map((c: any) => (
            <Card key={c.id}>
              <CardContent>
                <p className="font-medium"><span className="font-mono text-xs text-zinc-500">{c.code}</span> {c.title}</p>
                <p className="text-sm text-zinc-600">{c.description}</p>
                <p className="mt-1 flex flex-wrap gap-1"><StatusBadge status={c.status} />{c.aiClassification && <StatusBadge status={c.aiClassification} />}</p>
                {c.aiRationale && <p className="mt-1 text-xs text-zinc-500">{c.aiRationale}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </PortalShell>
    </PortalGuard>
  );
}
