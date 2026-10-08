'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Page, Button, Input } from '@/components/ui/primitives';

export default function NewCR() {
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState(''); const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  useEffect(() => {
    api.get('/api/workspaces').then(async (j: any) => {
      const all: any[] = [];
      for (const w of j.data ?? []) { try { const p = await api.get(`/api/projects?workspaceId=${w.id}`); all.push(...(p.data ?? [])); } catch {} }
      setProjects(all); if (all[0]) { setProjectId(all[0].id); setClientId(all[0].clientId); }
    }).catch(() => {});
  }, []);
  return (
    <Page title="Submit change request">
      <select className="rounded border p-2 text-sm" value={projectId} onChange={(e) => { setProjectId(e.target.value); setClientId(projects.find((p) => p.id === e.target.value)?.clientId ?? ''); }}>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="mt-2 grid gap-2">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="rounded border p-2" rows={5} placeholder="Describe the change..." value={description} onChange={(e) => setDescription(e.target.value)} />
        <Button onClick={async () => { await api.post('/api/change-requests', { projectId, clientId, title, description }); alert('Submitted — AI-05 analysis queued'); }}>Submit</Button>
      </div>
    </Page>
  );
}
