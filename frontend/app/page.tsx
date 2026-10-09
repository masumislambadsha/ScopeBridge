import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto max-w-4xl p-6 text-center sm:p-10">
      <h1 className="text-3xl font-bold sm:text-4xl">ScopeBridge</h1>
      <p className="mx-auto mt-3 max-w-2xl text-zinc-600">
        Client input → requirements → AI analysis → approved scope → tasks → change requests → new versions.
        One traceable chain that eliminates scope creep and protects agency revenue.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/register" className="rounded-md bg-zinc-900 px-5 py-2 text-white">
          Get started
        </Link>
        <Link href="/login" className="rounded-md border px-5 py-2">
          Login
        </Link>
        <Link href="/portal/login" className="rounded-md border px-5 py-2">
          Client portal
        </Link>
      </div>
      <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
        {[
          ["Traceable intake", "Information requests, submissions and files feed AI-extracted requirements."],
          ["Change Request Firewall", "No client change becomes work without analysis, approval and a new scope version."],
          ["Client portal", "Approvals, signatures and change requests in one place your clients understand."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-lg border bg-white p-4">
            <p className="font-semibold">{t}</p>
            <p className="mt-1 text-sm text-zinc-600">{d}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
