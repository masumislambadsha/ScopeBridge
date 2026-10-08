import { Nav } from '@/components/ui/primitives';

export default function Landing() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl p-10 text-center">
        <h1 className="text-4xl font-bold">ScopeBridge</h1>
        <p className="mt-3 text-zinc-600">Client Input → Requirement → AI Analysis → Approved Scope → Developer Task → Change Request → AI Scope Analysis → Approval → New Scope Version. Eliminate scope creep.</p>
        <div className="mt-6 flex justify-center gap-3">
          <a href="/register" className="rounded-md bg-zinc-900 px-5 py-2 text-white">Get started</a>
          <a href="/login" className="rounded-md border px-5 py-2">Login</a>
          <a href="/portal/login" className="rounded-md border px-5 py-2">Client portal</a>
        </div>
      </main>
    </>
  );
}
