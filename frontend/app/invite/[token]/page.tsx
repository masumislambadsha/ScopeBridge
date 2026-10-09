"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";

interface Preview {
  type: string;
  email: string;
  role: string | null;
  workspace: { id: string; name: string };
  client: { id: string; name: string } | null;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { session, reload } = useAuth();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Preview>(`/api/invitations/${token}`)
      .then((r) => setPreview(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Invalid invitation"));
  }, [token]);

  async function accept() {
    try {
      await api.post(`/api/invitations/${token}/accept`, {});
      toast.success("Invitation accepted");
      await reload();
      router.push(preview?.type === "CLIENT_PORTAL" ? "/portal" : "/dashboard");
    } catch {
      // New user: register with the invite token attached.
      router.push(`/register?inviteToken=${token}`);
    }
  }

  return (
    <AuthShell
      title="Invitation"
      description={session ? `Signed in as ${session.user.email}` : "You are invited to ScopeBridge."}
    >
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {preview && (
        <div className="grid gap-4">
          <p className="text-[15px] leading-relaxed text-warm-700">
            {preview.type === "CLIENT_PORTAL" ? (
              <>You are invited to the client portal{preview.client ? <> for <b>{preview.client.name}</b></> : null} at <b>{preview.workspace.name}</b>.</>
            ) : (
              <>You are invited to join <b>{preview.workspace.name}</b> as <b>{preview.role}</b>.</>
            )}
          </p>
          <p className="text-xs text-warm-500">Sent to {preview.email}</p>
          {session ? (
            <Button size="pill" onClick={accept}>Accept invitation</Button>
          ) : (
            <div className="flex gap-2">
              <Link href={`/register?inviteToken=${token}`} className="flex-1 rounded-full bg-ink px-4 py-2.5 text-center text-sm font-semibold text-warm-50">
                Create account & accept
              </Link>
              <Link href={`/login?inviteToken=${token}`} className="flex-1 rounded-full border border-warm-200 px-4 py-2.5 text-center text-sm font-semibold hover:border-sage-300">
                Log in & accept
              </Link>
            </div>
          )}
        </div>
      )}
    </AuthShell>
  );
}
