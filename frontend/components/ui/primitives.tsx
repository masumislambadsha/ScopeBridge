import { ButtonHTMLAttributes } from 'react';
export function Button({ className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={`rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 ${className}`} />;
}
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-md border px-3 py-2 text-sm ${props.className ?? ''}`} />;
}
export function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      {children}
    </main>
  );
}
export function Nav() {
  const links = [['/dashboard','Dashboard'],['/workspaces','Workspaces'],['/clients','Clients'],['/projects','Projects'],['/notifications','Notifications']];
  return (
    <nav className="flex gap-4 border-b bg-white px-6 py-3 text-sm">
      <a href="/" className="font-bold">ScopeBridge</a>
      {links.map(([h, l]) => <a key={h} href={h} className="text-zinc-600 hover:text-black">{l}</a>)}
      <a href="/portal/dashboard" className="ml-auto text-zinc-600">Client portal</a>
    </nav>
  );
}
