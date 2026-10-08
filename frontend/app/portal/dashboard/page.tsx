'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Page, Card } from '@/components/ui/primitives';

export default function PortalDashboard() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    api.get('/api/workspaces').then(async (j: any) => {
      const ws = j.data ?? [];
      const all: any[] = [];
      for (const w of ws) {
        try { const p = await api.get(`/api/projects?workspaceId=${w.id}`); all.push(...(p.data ?? [])); } catch {}
      }
      setItems(all);
    }).catch(() => {});
  }, []);
  return <Page title="Client — My projects"><div className="grid gap-2">{items.map((p) => (
    <Card key={p.id}><a className="underline font-medium" href={`/portal/projects/${p.id}`}>{p.name}</a><p className="text-xs">{p.status}</p></Card>
  ))}</div></Page>;
}
