'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Nav, Page, Card } from '@/components/ui/primitives';

export default function Notifications() {
  const [items, setItems] = useState<any[]>([]);
  const load = () => api.get('/api/notifications').then((j: any) => setItems(j.data ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <>
      <Nav />
      <Page title="Notifications">
        <div className="grid gap-2">{items.map((n) => (
          <Card key={n.id}><p className="font-medium">{n.title} {!n.read && <span className="text-xs text-blue-600">●</span>}</p>
            <p className="text-xs">{n.body}</p>
            {!n.read && <button className="text-xs underline" onClick={async () => { await api.patch(`/api/notifications/${n.id}/read`, {}); load(); }}>Mark read</button>}
          </Card>
        ))}</div>
      </Page>
    </>
  );
}
