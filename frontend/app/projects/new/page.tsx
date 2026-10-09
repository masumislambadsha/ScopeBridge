"use client";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, ApiError, fieldErrors } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, FieldError, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/layout";

const schema = z.object({
  clientId: z.string().min(1, "Client required"),
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  projectType: z.enum(["E_COMMERCE", "SAAS", "MOBILE_APP", "WEBSITE", "CUSTOM"]),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
});

export default function NewProjectPage() {
  const { workspaceId } = useWorkspace();
  const router = useRouter();
  const clients = useQuery({
    queryKey: ["clients", workspaceId, "all"],
    queryFn: () => api.get<any[]>(`/api/clients?workspaceId=${workspaceId}&limit=100`).then((r) => r.data),
    enabled: !!workspaceId,
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { projectType: "CUSTOM" } });
  const create = useMutation({
    mutationFn: (v: z.infer<typeof schema>) => api.post("/api/projects", { ...v, workspaceId }),
    onSuccess: (r: any) => {
      toast.success("Project created");
      router.push(`/projects/${r.data.id}`);
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        const fe = fieldErrors(e);
        for (const [k, m] of Object.entries(fe)) form.setError(k as "name" | "clientId", { message: m });
        toast.error(e.message);
      } else toast.error("Create failed");
    },
  });

  return (
    <AgencyGuard>
      <AgencyShell>
        <PageHeader title="New project" />
        <Card>
          <CardHeader><CardTitle>Project details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="clientId">Client</Label>
                <Select id="clientId" {...form.register("clientId")}>
                  <option value="">Select a client…</option>
                  {(clients.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>)}
                </Select>
                <FieldError message={form.formState.errors.clientId?.message} />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register("name")} />
                <FieldError message={form.formState.errors.name?.message} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...form.register("description")} />
              </div>
              <div>
                <Label htmlFor="projectType">Project type</Label>
                <Select id="projectType" {...form.register("projectType")}>
                  <option value="CUSTOM">Custom</option>
                  <option value="E_COMMERCE">E-commerce</option>
                  <option value="SAAS">SaaS</option>
                  <option value="MOBILE_APP">Mobile app</option>
                  <option value="WEBSITE">Website</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="startDate">Start</Label>
                  <Input id="startDate" type="date" {...form.register("startDate")} />
                </div>
                <div>
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input id="deadline" type="date" {...form.register("deadline")} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={create.isPending}>Create project</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </AgencyShell>
    </AgencyGuard>
  );
}
