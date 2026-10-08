'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Nav, Page, Card, Button } from '@/components/ui/primitives';

export default function ScopePage({ params }: { params: { id: string } }) {
  const [scopes, setScopes] = useState<any>(null);
  const [scopeId, setScopeId] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const create = async () => {
    const j = await api.post('/api/scopes', { projectId: params.id, features: [], deliverables: [], exclusions: [] });
    setScopeId(j.data.id); loadDetail(j.data.id);
  };
  const loadDetail = (id: string) => api.get(`/api/scopes/${id}`).then((j: any) => setDetail(j.data)).catch(() => {});
  return (
    <>
      <Nav />
      <Page title="Scope builder">
        <div className="flex gap-2">
          <Button onClick={create}>Create scope (triggers AI-04)</Button>
          {scopeId && <Button onClick={async () => { await api.post('/api/ai/acceptance-criteria', { projectId: params.id, scopeId }); alert('AI-04 queued'); }}>Regenerate AI draft</Button>}
        </div>
        <div className="mt-2 flex gap-2 text-sm">
          <input placeholder="scopeId" className="rounded border p-2" value={scopeId} onChange={(e) => setScopeId(e.target.value)} />
          <button className="underline" onClick={() => loadDetail(scopeId)}>Load</button>
        </div>
        {detail && <Card><pre className="overflow-auto text-xs">{JSON.stringify(detail, null, 2)}</pre>
          <div className="mt-2 flex gap-2 text-sm">
            <button className="underline" onClick={async () => { await api.post(`/api/scopes/${detail.id}/versions`, {}); loadDetail(detail.id); }}>New version</button>
          </div></Card>}
        <p className="mt-2 text-xs text-zinc-500">PM reviews/edits AI draft, then requests approval. Approval flow emits approval:requested / scope:approved / scope:rejected.</p>
      </Page>
    </>
  );
}
