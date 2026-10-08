'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Nav, Page, Card, Button, Input } from '@/components/ui/primitives';

function useWorkspaces() {
  const [ws, setWs] = useState<any[]>([]);
  useEffect(() => { api.get('/api/workspaces').then((j: any) => setWs(j.data ?? [])).catch(() => {}); }, []);
  return ws;
}

export default function Clients() {
  const ws = useWorkspaces();
  const [wsId, setWsId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const load = () => wsId && api.get(`/api/clients?workspaceId=${wsId}`).then((j: any) => setItems(j.data ?? [])).catch(() => {});
  useEffect(() => { if (ws[0] && !wsId) setWsId(ws[0].id); }, [ws]);
  useEffect(() => { load(); }, [wsId]);
  return (
    <>
      <Nav />
      <Page title="Clients">
        <select className="rounded border p-2 text-sm" value={wsId} onChange={(e) => setWsId(e.target.value)}>
          <option value="">Select workspace</option>{ws.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <div className="mt-2 flex gap-2"><Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={async () => { await api.post('/api/clients', { workspaceId: wsId, name, email }); setName(''); setEmail(''); load(); }}>Add</Button></div>
        <div className="mt-4 grid gap-2">{items.map((c) => <Card key={c.id}><p className="font-medium">{c.name} <span className="text-xs text-zinc-500">{c.company ?? ''}</span></p><p className="text-xs">{c.email}</p></Card>)}</div>
      </Page>
    </>
  );
}
