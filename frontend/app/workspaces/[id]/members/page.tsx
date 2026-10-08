'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Nav, Page, Card, Button, Input } from '@/components/ui/primitives';

export default function Members({ params }: { params: { id: string } }) {
  const [items, setItems] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const load = () => api.get(`/api/workspaces/${params.id}/members`).then((j: any) => setItems(j.data ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <>
      <Nav />
      <Page title="Team members">
        <div className="flex gap-2"><Input placeholder="member email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={async () => { await api.post(`/api/workspaces/${params.id}/members`, { email, role: 'TEAM_MEMBER' }); setEmail(''); load(); }}>Add</Button></div>
        <div className="mt-4 grid gap-2">{items.map((m) => (
          <Card key={m.id}><p>{m.user?.name} — {m.user?.email} · {m.role}</p>
            <div className="mt-1 flex gap-2 text-xs">
              <button className="underline" onClick={async () => { await api.patch(`/api/workspaces/${params.id}/members/${m.id}`, { role: 'PROJECT_MANAGER' }); load(); }}>Make PM</button>
              <button className="underline" onClick={async () => { await api.del(`/api/workspaces/${params.id}/members/${m.id}`); load(); }}>Remove</button>
            </div></Card>
        ))}</div>
      </Page>
    </>
  );
}
