'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Page, Card, Button } from '@/components/ui/primitives';

export default function ReviewApproval({ params }: { params: { id: string } }) {
  const [a, setA] = useState<any>(null); const [comment, setComment] = useState('');
  const load = () => api.get('/api/approvals').then((j: any) => setA((j.data ?? []).find((x: any) => x.id === params.id))).catch(() => {});
  useEffect(() => { load(); }, []);
  if (!a) return <Page title="Loading..."><p /></Page>;
  return (
    <Page title="Review scope">
      <Card><pre className="overflow-auto text-xs">{JSON.stringify(a, null, 2)}</pre></Card>
      <input className="mt-2 w-full rounded border p-2 text-sm" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="mt-2 flex gap-2">
        <Button onClick={async () => { await api.post(`/api/approvals/${a.id}/approve`, { comment }); load(); }}>Approve</Button>
        <Button onClick={async () => { await api.post(`/api/approvals/${a.id}/reject`, { comment }); load(); }}>Reject</Button>
      </div>
    </Page>
  );
}
