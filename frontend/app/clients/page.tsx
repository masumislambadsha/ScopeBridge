"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, ApiError, fieldErrors } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { PageHeader, Table } from "@/components/ui/layout";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";

const schema = z.object({ name: z.string().min(1), email: z.string().email(), company: z.string().optional() });

export default function ClientsPage() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["clients", workspaceId, page, q],
    queryFn: () => api.get<any[]>(`/api/clients?workspaceId=${workspaceId}&page=${page}&limit=20${q ? `&search=${encodeURIComponent(q)}` : ""}`).then((r) => ({ items: r.data, meta: r.meta! })),
    enabled: !!workspaceId,
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const create = useMutation({
    mutationFn: (v: z.infer<typeof schema>) => api.post("/api/clients", { ...v, workspaceId }),
    onSuccess: () => {
      toast.success("Client created");
      form.reset();
      void qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        const fe = fieldErrors(e);
        for (const [k, m] of Object.entries(fe)) form.setError(k as "name" | "email", { message: m });
        toast.error(e.message);
      } else toast.error("Create failed");
    },
  });

  return (
    <AgencyGuard>
      <AgencyShell>
        <PageHeader title="Clients" />
        <Card><CardContent>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-2 sm:grid-cols-4 sm:items-end">
            <div><Label htmlFor="name">Name</Label><Input id="name" {...form.register("name")} /><FieldError message={form.formState.errors.name?.message} /></div>
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" {...form.register("email")} /><FieldError message={form.formState.errors.email?.message} /></div>
            <div><Label htmlFor="company">Company</Label><Input id="company" {...form.register("company")} /></div>
            <Button type="submit" disabled={create.isPending}>Add client</Button>
          </form>
        </CardContent></Card>
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(search); }} className="mt-3 flex gap-2">
          <Input aria-label="Search clients" placeholder="Search name, email, company…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="outline" type="submit">Search</Button>
        </form>
        <div className="mt-3">
          {isLoading && <ListSkeleton />}
          {error && <ErrorState message="Could not load clients." onRetry={() => refetch()} />}
          {data && data.items.length === 0 && <EmptyState title="No clients" hint="Add your first client above." />}
          {data && data.items.length > 0 && (
            <>
              <div className="hidden md:block">
                <Table>
                  <thead><tr className="border-b text-left text-xs text-warm-500"><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Company</th><th className="p-2">Projects</th><th className="p-2">Status</th></tr></thead>
                  <tbody>
                    {data.items.map((c: any) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="p-2 font-medium"><Link className="underline" href={`/clients/${c.id}`}>{c.name}</Link></td>
                        <td className="p-2">{c.email}</td><td className="p-2">{c.company ?? "—"}</td>
                        <td className="p-2">{c._count?.projects ?? 0}</td>
                        <td className="p-2"><StatusBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div className="grid gap-2 md:hidden">
                {data.items.map((c: any) => (
                  <Card key={c.id}><CardContent>
                    <Link className="font-medium underline" href={`/clients/${c.id}`}>{c.name}</Link>
                    <p className="text-xs text-warm-500">{c.email} · {c.company ?? "—"}</p>
                    <StatusBadge status={c.status} />
                  </CardContent></Card>
                ))}
              </div>
              {data.meta.totalPages > 1 && (
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              )}
            </>
          )}
        </div>
      </AgencyShell>
    </AgencyGuard>
  );
}
