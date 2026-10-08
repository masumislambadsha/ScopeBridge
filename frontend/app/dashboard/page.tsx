'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Nav, Page, Card } from '@/components/ui/primitives';
import { useSocket } from '@/lib/socket';

export default function Dashboard() {
  const [wsId, setWsId] = useState('');
  const [data, setData] = useState<any>(null);
  const { events } = useSocket();
  useEffect(() => {
    api.get('/api/workspaces').then((j: any) => {
      const first = j.data?.[0] ?? j.pagination ? j.data?.[0] : null;
      const list = j.data ?? [];
      if (list[0]) { setWsId(list[0].id); api.get(`/api/dashboard/analytics?workspaceId=${list[0].id}`).then(setData).catch(() => {}); }
    }).catch(() => {});
  }, []);
  return (
    <>
      <Nav />
      <Page title="Dashboard — Overview + analytics">
        <Card><p className="text-sm text-zinc-600">Workspace: {wsId || '—'}</p>
          <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre>
        </Card>
        <h2 className="my-3 font-semibold">Real-time events</h2>
        <Card><ul className="text-xs">{events.map((e, i) => <li key={i}>{e.e} — {JSON.stringify(e.d).slice(0, 120)}</li>)}</ul></Card>
      </Page>
    </>
  );
}
