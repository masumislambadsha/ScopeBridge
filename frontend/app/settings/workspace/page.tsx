"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/layout";
import { ErrorState, ListSkeleton } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/dialog";

export default function WorkspaceSettingsPage() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.get<any>(`/api/workspaces/${workspaceId}`).then((r) => r.data),
    enabled: !!workspaceId,
  });

  const save = useMutation({
    mutationFn: () => api.patch(`/api/workspaces/${workspaceId}`, { name: name || undefined, description: desc }),
    onSuccess: () => {
      toast.success("Workspace updated");
      void qc.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });
  const destroy = useMutation({
    mutationFn: () => api.del(`/api/workspaces/${workspaceId}`),
    onSuccess: () => {
      toast.success("Workspace deleted");
      router.push("/workspaces");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Delete failed"),
  });

  return (
    <AgencyGuard>
      <AgencyShell>
        <PageHeader title="Workspace settings" />
        {!workspaceId && <ErrorState message="Select a workspace first." />}
        {workspaceId && isLoading && <ListSkeleton />}
        {workspaceId && error && <ErrorState message="Could not load workspace." onRetry={() => refetch()} />}
        {workspaceId && data && (
          <div className="grid gap-3">
            <Card>
              <CardHeader><CardTitle>Edit</CardTitle></CardHeader>
              <CardContent className="grid gap-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" defaultValue={data.name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="desc">Description</Label>
                  <Input id="desc" defaultValue={data.description ?? ""} onChange={(e) => setDesc(e.target.value)} />
                </div>
                <div><Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Owner</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-warm-600">Owner ID: {data.ownerId}. The owner cannot be removed or demoted; at least one admin must remain.</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Danger zone</CardTitle></CardHeader>
              <CardContent className="grid gap-2">
                <p className="text-sm text-warm-600">Type the workspace name to confirm deletion.</p>
                <Input aria-label="Confirmation" placeholder={data.name} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                <div><Button variant="destructive" disabled={confirm !== data.name} onClick={() => setShowDelete(true)}>Delete workspace</Button></div>
              </CardContent>
            </Card>
          </div>
        )}
        <ConfirmDialog open={showDelete} onClose={() => setShowDelete(false)} onConfirm={() => destroy.mutate()} title="Delete this workspace?" body="All projects, clients and history in it are deleted. This cannot be undone." confirmLabel="Delete forever" danger />
      </AgencyShell>
    </AgencyGuard>
  );
}
