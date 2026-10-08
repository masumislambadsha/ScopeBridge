'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Nav, Page, Card, Button, Input } from '@/components/ui/primitives';

export default function Tasks({ params }: { params: { id: string } }) {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const load = () => api.get(`/api/tasks?projectId=${params.id}`).then((j: any) => setItems(j.data ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);
  const cols: Array<[string, any[]]> = [['TODO', []], ['IN_PROGRESS', []], ['REVIEW', []], ['COMPLETED', []]];
  items.forEach((t) => cols.find((c) => c[0] === t.status)?.[1].push(t));
  return (
    <>
      <Nav />
      <Page title="Task board">
        <div className="flex gap-2"><Input placeholder="New task" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button onClick={async () => { await api.post('/api/tasks', { projectId: params.id, title }); setTitle(''); load(); }}>Add</Button>
          <Button onClick={async () => { await api.post(`/api/projects/${params.id}/tasks/bulk`, { tasks: [{ title: 'Bulk task 1' }, { title: 'Bulk task 2' }] }); load(); }}>Bulk create</Button></div>
        <div className="mt-4 grid grid-cols-4 gap-2">{cols.map(([s, list]) => (
          <Card key={s}><h3 className="font-semibold">{s}</h3>
            {list.map((t) => <div key={t.id} className="mt-1 rounded border p-2 text-xs"><p className="font-medium">{t.title}</p>
              <select value={t.status} onChange={async (e) => { await api.patch(`/api/tasks/${t.id}`, { status: e.target.value }); load(); }}>
                <option>TODO</option><option>IN_PROGRESS</option><option>REVIEW</option><option>COMPLETED</option>
              </select></div>)}
          </Card>
        ))}</div>
      </Page>
    </>
  );
}
