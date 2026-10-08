'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Nav, Page, Card, Button, Input } from '@/components/ui/primitives';

export default function Workspaces() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const load = () => api.get('/api/workspaces').then((j: any) => setItems(j.data ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <>
      <Nav />
      <Page title="Workspaces">
        <div className="flex gap-2"><Input placeholder="New workspace name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={async () => { await api.post('/api/workspaces', { name }); setName(''); load(); }}>Create</Button></div>
        <div className="mt-4 grid gap-2">{items.map((w) => (
          <Card key={w.id}><a href={`/workspaces/${w.id}/members`} className="font-medium underline">{w.name}</a>
            <p className="text-xs text-zinc-500">{w.id} · role {w.role}</p></Card>
        ))}</div>
      </Page>
    </>
  );
}
