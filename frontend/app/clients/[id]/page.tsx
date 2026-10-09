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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, FieldError, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  phone: z.string().optional(),
  contactName: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["client", params.id],
    queryFn: () => api.get<any>(`/api/clients/${params.id}`).then((r) => r.data),
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const save = useMutation({
    mutationFn: (v: z.infer<typeof schema>) => api.patch(`/api/clients/${params.id}`, v),
    onSuccess: () => {
      toast.success("Client updated");
      void qc.invalidateQueries({ queryKey: ["client", params.id] });
      void qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/api/clients/${params.id}`),
    onSuccess: () => {
      toast.success("Client deleted");
      window.location.href = "/clients";
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Delete failed"),
  });
  const invite = useMutation({
    mutationFn: () => api.post(`/api/clients/${params.id}/portal-invite`, {}),
    onSuccess: () => {
      toast.success("Portal invitation sent by email");
      void qc.invalidateQueries({ queryKey: ["client", params.id] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Invite failed"),
  });

  return (
    <AgencyGuard>
      <AgencyShell>
        <PageHeader title={data?.name ?? "Client"} actions={data && <StatusBadge status={data.status} />} />
        {isLoading && <ListSkeleton />}
        {error && <ErrorState message="Could not load client." onRetry={() => refetch()} />}
        {data && (
          <div className="grid gap-3">
            <Card>
              <CardHeader><CardTitle>Portal access</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="flex-1 text-sm text-zinc-600">
                  {data.portalUserId ? "This client has portal access." : "This client cannot log in yet."}
                </p>
                {!data.portalUserId && <Button onClick={() => invite.mutate()} disabled={invite.isPending}>Invite to portal</Button>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Edit</CardTitle></CardHeader>
              <CardContent>
                <form
                  onSubmit={form.handleSubmit((v) => save.mutate(v))}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {(["name", "email", "company", "phone", "contactName", "address"] as const).map((f) => (
                    <div key={f}>
                      <Label htmlFor={f}>{f}</Label>
                      <Input id={f} defaultValue={data[f] ?? ""} {...form.register(f)} />
                      <FieldError message={form.formState.errors[f]?.message} />
                    </div>
                  ))}
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select id="status" defaultValue={data.status} {...form.register("status")}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="ARCHIVED">Archived</option>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input id="notes" defaultValue={data.notes ?? ""} {...form.register("notes")} />
                  </div>
                  <div className="sm:col-span-2"><Button type="submit" disabled={save.isPending}>Save</Button></div>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Projects ({data.projects?.length ?? 0})</CardTitle></CardHeader>
              <CardContent>
                {(data.projects ?? []).length === 0 && <p className="text-sm text-zinc-500">No projects yet.</p>}
                <ul className="grid gap-1 text-sm">
                  {(data.projects ?? []).map((p: any) => (
                    <li key={p.id}><a className="underline" href={`/projects/${p.id}`}>{p.name}</a> <StatusBadge status={p.status} /></li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Danger zone</CardTitle></CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => setConfirmDelete(true)}>Delete client</Button>
                <p className="mt-1 text-xs text-zinc-500">Clients with projects cannot be deleted — archive them instead.</p>
              </CardContent>
            </Card>
          </div>
        )}
        <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => remove.mutate()} title="Delete this client?" confirmLabel="Delete" danger />
      </AgencyShell>
    </AgencyGuard>
  );
}
