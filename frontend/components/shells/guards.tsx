"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/states";

/** Unauthenticated → /login. Client-only users visiting agency routes → /portal. */
export function AgencyGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
    else if (session.isClientOnly) router.replace("/portal");
  }, [session, loading, router]);
  if (loading || !session || session.isClientOnly) {
    return (
      <div className="mx-auto max-w-6xl space-y-2 p-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  return <>{children}</>;
}

/** Unauthenticated → /login. Agency-only users visiting portal routes → /dashboard. */
export function PortalGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
    else if (!session.isClientOnly && session.portalAccess.length === 0) router.replace("/dashboard");
  }, [session, loading, router]);
  if (loading || !session) {
    return (
      <div className="mx-auto max-w-6xl space-y-2 p-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  return <>{children}</>;
}
