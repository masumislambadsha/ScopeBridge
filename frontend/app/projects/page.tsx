'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Nav, Page, Card, Button, Input } from '@/components/ui/primitives';

export default function Projects() {
  const [ws, setWs] = useState<any[]>([]); const [wsId, setWsId] = useState('');
  const [items, setItems] = useState<any[]>([]); const [clients, setClients] = useState<any[]>([]);
  const [name, setName] = useState(''); const [clientId, setClientId] = useState('');
  useEffect(() => { api.get('/api/workspaces').then((j: any) => setWs(j.data ?? [])).catch(() => {}); }, []);
  useEffect(() => { if (ws[0] && !wsId) setWsId(ws[0].id); }, [ws]);
  const load = () => {
    if (!wsId) return;
    api.get(`/api/projects?workspaceId=${wsId}`).then((j: any) => setItems(j.data ?? [])).catch(() => {});
    api.get(`/api/clients?workspaceId=${wsId}`).then((j: any) => setClients(j.data ?? [])).catch(() => {});
  };
  useEffect(() => { load(); }, [wsId]);
  return (
    <>
      <Nav />
      <Page title="Projects">
        <select className="rounded border p-2 text-sm" value={wsId} onChange={(e) => setWsId(e.target.value)}>
          <option value="">Select workspace</option>{ws.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <div className="mt-2 flex gap-2">
          <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="rounded border p-2 text-sm" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button onClick={async () => { await api.post('/api/projects', { workspaceId: wsId, clientId, name }); setName(''); load(); }}>Create</Button>
        </div>
        <div className="mt-4 grid gap-2">{items.map((p) => (
          <Card key={p.id}><a href={`/projects/${p.id}`} className="font-medium underline">{p.name}</a>
            <p className="text-xs text-zinc-500">{p.status} · {p.client?.name}</p></Card>
        ))}</div>
      </Page>
    </>
  );
}
