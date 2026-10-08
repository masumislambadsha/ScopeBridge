'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Page, Card, Button } from '@/components/ui/primitives';

export default function AnswerRequest({ params }: { params: { id: string } }) {
  const [ir, setIr] = useState<any>(null);
  const [answers, setAnswers] = useState(''); const [file, setFile] = useState<File | null>(null);
  useEffect(() => { api.get(`/api/information-requests/${params.id}`).then((j: any) => setIr(j.data)).catch(() => {}); }, []);
  const submit = async () => {
    const fd = new FormData();
    fd.append('projectId', ir.projectId); fd.append('clientId', ir.project?.clientId ?? '');
    fd.append('informationRequestId', ir.id); fd.append('answers', JSON.stringify({ text: answers }));
    if (file) fd.append('file', file);
    await api.post('/api/submissions', fd);
    alert('Submitted — AI extraction queued (AI-02)');
  };
  if (!ir) return <Page title="Loading..."><p /></Page>;
  return (
    <Page title={ir.title}>
      <Card><p className="text-sm">{ir.description}</p><pre className="text-xs">{JSON.stringify(ir.questions, null, 2)}</pre></Card>
      <textarea className="mt-2 w-full rounded border p-2" rows={6} placeholder="Your answers..." value={answers} onChange={(e) => setAnswers(e.target.value)} />
      <input type="file" className="mt-2 text-sm" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <p className="text-xs text-zinc-500">Max 10MB. Files go to Cloudinary.</p>
      <div className="mt-2"><Button onClick={submit}>Submit answers + file</Button></div>
    </Page>
  );
}
