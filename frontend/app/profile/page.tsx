"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/layout";

export default function ProfilePage() {
  const { session, reload } = useAuth();
  const [name, setName] = useState("");
  const save = useMutation({
    mutationFn: () => api.patch(`/api/users/${session!.user.id}`, { name }),
    onSuccess: () => {
      toast.success("Profile updated");
      void reload();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });

  return (
    <AgencyGuard>
      <AgencyShell>
        <PageHeader title="Profile" />
        <Card>
          <CardHeader><CardTitle>{session?.user.name}</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            <p className="text-sm text-zinc-600">{session?.user.email}</p>
            <div>
              <Label htmlFor="name">Display name</Label>
              <Input id="name" defaultValue={session?.user.name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div><Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>Save</Button></div>
          </CardContent>
        </Card>
      </AgencyShell>
    </AgencyGuard>
  );
}
