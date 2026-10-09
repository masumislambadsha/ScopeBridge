"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";

export function SubmissionsTab({ projectId }: { projectId: string }) {
  const subs = useQuery({
    queryKey: ["submissions", projectId],
    queryFn: () => api.get<any[]>(`/api/submissions?projectId=${projectId}&limit=50`).then((r) => r.data),
  });
  const files = useQuery({
    queryKey: ["files", projectId],
    queryFn: () => api.get<any[]>(`/api/files?projectId=${projectId}&limit=50`).then((r) => r.data),
  });

  return (
    <div className="grid gap-3">
      <Card>
        <CardHeader><CardTitle>Submissions ({subs.data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {subs.isLoading && <ListSkeleton rows={2} />}
          {subs.error && <ErrorState message="Could not load submissions." onRetry={() => subs.refetch()} />}
          {subs.data && subs.data.length === 0 && <EmptyState title="No submissions yet" hint="They appear when the client answers a request." />}
          <ul className="grid gap-2">
            {(subs.data ?? []).map((s: any) => (
              <li key={s.id} className="rounded border p-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.informationRequestId ? "Request answer" : "Additional info"}</span>
                  <StatusBadge status={s.status} />
                  <span className="text-xs text-warm-500">{new Date(s.createdAt).toLocaleString()}</span>
                </div>
                <dl className="mt-1 grid gap-1">
                  {Object.entries((s.answers ?? {}) as Record<string, string>).map(([k, v]) => (
                    <div key={k}><dt className="text-xs font-medium text-warm-500">{k}</dt><dd className="whitespace-pre-wrap">{v}</dd></div>
                  ))}
                </dl>
                {s.additionalInfo && <p className="mt-1 text-sm italic">{s.additionalInfo}</p>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Files ({files.data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {files.isLoading && <ListSkeleton rows={2} />}
          {files.error && <ErrorState message="Could not load files." onRetry={() => files.refetch()} />}
          <ul className="grid gap-1 text-sm">
            {(files.data ?? []).map((f: any) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 rounded border px-2 py-1">
                <span className="font-medium">{f.originalName}</span>
                <span className="text-xs text-warm-500">{f.mimeType} · {(f.size / 1024).toFixed(1)} KB · by {f.uploadedBy?.name}</span>
                <StatusBadge status={f.extractionStatus} />
                <a className="ml-auto text-xs underline" href={`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/files/${f.id}/download`}>
                  Download
                </a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
