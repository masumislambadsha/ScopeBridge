'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Page, Card } from '@/components/ui/primitives';

export default function PortalProject({ params }: { params: { id: string } }) {
  const [p, setP] = useState<any>(null); const [reqs, setReqs] = useState<any[]>([]); const [approvals, setApprovals] = useState<any[]>([]);
  useEffect(() => {
    api.get(`/api/projects/${params.id}`).then((j: any) => setP(j.data)).catch(() => {});
    api.get(`/api/information-requests?projectId=${params.id}`).then((j: any) => setReqs(j.data ?? [])).catch(() => {});
    api.get('/api/approvals').then((j: any) => setApprovals((j.data ?? []).filter((a: any) => a.scope?.projectId === params.id))).catch(() => {});
  }, []);
  return (
    <Page title={p?.name ?? 'Project'}>
      <h2 className="font-semibold">Information requests</h2>
      <div className="grid gap-2">{reqs.map((r) => <Card key={r.id}><a className="underline" href={`/portal/requests/${r.id}`}>{r.title}</a><p className="text-xs">{r.status}</p></Card>)}</div>
      <h2 className="mt-4 font-semibold">Approvals</h2>
      <div className="grid gap-2">{approvals.map((a) => <Card key={a.id}><a className="underline" href={`/portal/approvals/${a.id}`}>Scope v{a.scopeVersion?.version} — {a.status}</a></Card>)}</div>
      <p className="mt-4"><a className="underline text-sm" href="/portal/change-requests/new">+ Submit change request</a></p>
    </Page>
  );
}
