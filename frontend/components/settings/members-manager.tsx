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
import { Input, Label, FieldError, Select } from "@/components/ui/input";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";

const schema = z.object({ email: z.string().email("Valid email required"), role: z.enum(["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER"]) });

export function MembersManager({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [removeId, setRemoveId] = useState<string | null>(null);
  const key = ["members", workspaceId];
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => api.get<any[]>(`/api/workspaces/${workspaceId}/members`).then((r) => r.data),
  });
  const invites = useQuery({
    queryKey: ["invitations", workspaceId],
    queryFn: () => api.get<any[]>(`/api/workspaces/${workspaceId}/invitations`).then((r) => r.data),
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { role: "TEAM_MEMBER" } });
  const invite = useMutation({
    mutationFn: (v: z.infer<typeof schema>) => api.post(`/api/workspaces/${workspaceId}/invitations`, { ...v, type: "MEMBER" }),
    onSuccess: () => {
      toast.success("Invitation sent by email");
      form.reset({ role: "TEAM_MEMBER" } as never);
      void qc.invalidateQueries({ queryKey: ["invitations", workspaceId] });
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Invite failed"),
  });
  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/api/workspaces/${workspaceId}/members/${id}`, { role }),
    onSuccess: () => {
      toast.success("Role updated");
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/workspaces/${workspaceId}/members/${id}`),
    onSuccess: () => {
      toast.success("Member removed");
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Remove failed"),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.del(`/api/invitations/${id}`),
    onSuccess: () => {
      toast.success("Invitation revoked");
      void invites.refetch();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Revoke failed"),
  });

  return (
    <>
      <Card><CardContent>
        <form onSubmit={form.handleSubmit((v) => invite.mutate(v))} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            <FieldError message={form.formState.errors.email?.message} />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select id="role" {...form.register("role")}>
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="PROJECT_MANAGER">Project Manager</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>
          <Button type="submit" disabled={invite.isPending}>Invite</Button>
        </form>
      </CardContent></Card>
      <div className="mt-3">
        {isLoading && <ListSkeleton />}
        {error && <ErrorState message="Could not load members." onRetry={() => refetch()} />}
        {data && data.length === 0 && <EmptyState title="No members yet" />}
        <div className="grid gap-2">
          {data?.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-medium">{m.user?.name} <span className="text-xs text-warm-500">{m.user?.email}</span></p>
                  <StatusBadge status={m.role} />
                </div>
                <div className="flex gap-2">
                  <Select aria-label="Change role" value={m.role} onChange={(e) => changeRole.mutate({ id: m.id, role: e.target.value })}>
                    <option value="TEAM_MEMBER">Team Member</option>
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="ADMIN">Admin</option>
                  </Select>
                  <Button variant="destructive" size="sm" onClick={() => setRemoveId(m.id)}>Remove</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>Pending invitations</CardTitle></CardHeader>
        <CardContent>
          {(invites.data ?? []).length === 0 && <p className="text-sm text-warm-500">None.</p>}
          <ul className="grid gap-1 text-sm">
            {(invites.data ?? []).map((i: any) => (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <span>{i.email} · {i.role ?? i.type}</span>
                <Button variant="outline" size="sm" onClick={() => revoke.mutate(i.id)}>Revoke</Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <ConfirmDialog open={!!removeId} onClose={() => setRemoveId(null)} onConfirm={() => removeId && remove.mutate(removeId)} title="Remove member?" body="They lose access to this workspace immediately." confirmLabel="Remove" danger />
    </>
  );
}
