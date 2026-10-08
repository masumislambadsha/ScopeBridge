'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui/primitives';

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState('');
  return (
    <main className="mx-auto max-w-sm p-10">
      <h1 className="mb-4 text-2xl font-bold">Register</h1>
      <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="h-2" />
      <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="h-2" />
      <Input placeholder="Password (min 8)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <div className="h-3" />
      <Button onClick={() => register(name, email, password).catch((e) => setErr(e.message))}>Create account</Button>
    </main>
  );
}
