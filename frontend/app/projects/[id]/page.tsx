'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Nav, Page, Card, Button, Input } from '@/components/ui/primitives';
import { useSocket } from '@/lib/socket';

export default function ProjectDetail({ params }: { params: { id: string } }) {
  const [p, setP] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const { socket } = useSocket();
  const load = () => {
    api.get(`/api/projects/${params.id}`).then((j: any) => setP(j.data)).catch(() => {});
    api.get(`/api/messages?projectId=${params.id}`).then((j: any) => setMsgs(j.data ?? [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { socket?.emit('project:join', params.id); }, [socket]);
  return (
    <>
      <Nav />
      <Page title={p?.name ?? 'Project'}>
        <div className="flex gap-2 text-sm">
          <a className="underline" href={`/projects/${params.id}/requirements`}>Requirements</a>
          <a className="underline" href={`/projects/${params.id}/scope`}>Scope</a>
          <a className="underline" href={`/projects/${params.id}/tasks`}>Tasks</a>
          <a className="underline" href={`/projects/${params.id}/change-requests`}>Change requests</a>
        </div>
        <Card><pre className="overflow-auto text-xs">{JSON.stringify(p, null, 2)}</pre></Card>
        <h2 className="my-2 font-semibold">Messages</h2>
        <Card><ul className="text-sm">{msgs.map((m) => <li key={m.id}><b>{m.sender?.name}:</b> {m.content}</li>)}</ul>
          <div className="mt-2 flex gap-2"><Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write a message" />
            <Button onClick={async () => { await api.post('/api/messages', { projectId: params.id, content: msg }); setMsg(''); load(); }}>Send</Button></div>
        </Card>
      </Page>
    </>
  );
}
