'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Nav, Page, Card, Button } from '@/components/ui/primitives';

export default function CRs({ params }: { params: { id: string } }) {
  const [items, setItems] = useState<any[]>([]);
  const load = () => api.get(`/api/change-requests?projectId=${params.id}`).then((j: any) => setItems(j.data ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <>
      <Nav />
      <Page title="Change requests">
        <div className="grid gap-2">{items.map((c) => (
          <Card key={c.id}><p className="font-medium">{c.title} [{c.status}]</p>
            <p className="text-xs">{c.description}</p>
            {c.aiClassification && <p className="text-xs">AI: {c.aiClassification} — {c.aiRationale}</p>}
            {c.aiImpact && <pre className="text-xs">{JSON.stringify(c.aiImpact, null, 2)}</pre>}
            <div className="mt-1 flex gap-2 text-xs">
              <button className="underline" onClick={async () => { await api.post(`/api/change-requests/${c.id}/analyze`, {}); alert('AI-05 queued'); }}>Re-analyze</button>
              <button className="underline" onClick={async () => { await api.post(`/api/change-requests/${c.id}/approve`, {}); load(); }}>Accept (human)</button>
              <button className="underline" onClick={async () => { await api.post(`/api/change-requests/${c.id}/reject`, {}); load(); }}>Reject (human)</button>
            </div></Card>
        ))}</div>
        <p className="mt-2 text-xs text-zinc-500">AI never makes final decision — PM decides after seeing analysis.</p>
      </Page>
    </>
  );
}
