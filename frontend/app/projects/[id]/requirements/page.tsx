'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Nav, Page, Card, Button, Input } from '@/components/ui/primitives';

export default function Requirements({ params }: { params: { id: string } }) {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [checklist, setChecklist] = useState<any>(null);
  const load = () => api.get(`/api/requirements?projectId=${params.id}`).then((j: any) => setItems(j.data ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <>
      <Nav />
      <Page title="Requirements">
        <div className="flex gap-2">
          <Button onClick={async () => { const j = await api.post('/api/ai/checklist', { projectType: 'web app' }); setChecklist(j.data); }}>AI-01 Checklist</Button>
          <Button onClick={async () => { await api.post('/api/requirements/analyze-readiness', { projectId: params.id }); alert('AI-03 readiness queued'); }}>AI-03 Readiness</Button>
        </div>
        {checklist && <Card><pre className="text-xs">{JSON.stringify(checklist, null, 2)}</pre></Card>}
        <div className="mt-2 flex gap-2"><Input placeholder="New requirement title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button onClick={async () => { await api.post('/api/requirements', { projectId: params.id, title }); setTitle(''); load(); }}>Add</Button></div>
        <div className="mt-4 grid gap-2">{items.map((r) => (
          <Card key={r.id}><p className="font-medium">{r.title} <span className="text-xs">[{r.status}/{r.priority}/{r.source}]</span></p>
            <p className="text-xs text-zinc-500">{r.description ?? ''}</p>
            {r.aiFlags && <pre className="text-xs">{JSON.stringify(r.aiFlags, null, 2)}</pre>}
            <div className="mt-1 flex gap-2 text-xs">
              <button className="underline" onClick={async () => { await api.patch(`/api/requirements/${r.id}`, { status: 'ACCEPTED' }); load(); }}>Accept</button>
              <button className="underline" onClick={async () => { await api.patch(`/api/requirements/${r.id}`, { status: 'REJECTED' }); load(); }}>Reject</button>
            </div></Card>
        ))}</div>
      </Page>
    </>
  );
}
