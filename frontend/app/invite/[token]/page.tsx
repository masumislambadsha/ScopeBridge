"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Preview {
  type: string;
  email: string;
  role: string | null;
  workspace: { id: string; name: string };
  client: { id: string; name: string } | null;
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { session, reload } = useAuth();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Preview>(`/api/invitations/${params.token}`)
      .then((r) => setPreview(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Invalid invitation"));
  }, [params.token]);

  async function accept() {
    try {
      await api.post(`/api/invitations/${params.token}/accept`, {});
      toast.success("Invitation accepted");
      await reload();
      router.push(preview?.type === "CLIENT_PORTAL" ? "/portal" : "/dashboard");
    } catch {
      // New user: register with the invite token attached.
      router.push(`/register?inviteToken=${params.token}`);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>Invitation</CardTitle>
          <CardDescription>{session ? `Signed in as ${session.user.email}` : "You are invited to ScopeBridge."}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {preview && (
            <div className="grid gap-3">
              <p className="text-sm">
                {preview.type === "CLIENT_PORTAL" ? (
                  <>You are invited to the client portal{preview.client ? <> for <b>{preview.client.name}</b></> : null} at <b>{preview.workspace.name}</b>.</>
                ) : (
                  <>You are invited to join <b>{preview.workspace.name}</b> as <b>{preview.role}</b>.</>
                )}
              </p>
              <p className="text-xs text-zinc-500">Sent to {preview.email}</p>
              {session ? (
                <Button onClick={accept}>Accept invitation</Button>
              ) : (
                <div className="flex gap-2">
                  <Link href={`/register?inviteToken=${params.token}`} className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-center text-sm text-white">
                    Create account & accept
                  </Link>
                  <Link href={`/login?inviteToken=${params.token}`} className="flex-1 rounded-md border px-4 py-2 text-center text-sm">
                    Log in & accept
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
