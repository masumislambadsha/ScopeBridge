'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui/primitives';

export default function PortalLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState('');
  return (
    <main className="mx-auto max-w-sm p-10">
      <h1 className="mb-4 text-2xl font-bold">Client portal login</h1>
      <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="h-2" />
      <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <div className="h-3" />
      <Button onClick={() => login(email, password).catch((e) => setErr(e.message))}>Login</Button>
    </main>
  );
}
