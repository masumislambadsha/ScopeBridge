"use client";
import { useWorkspace } from "@/lib/workspace";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { PageHeader } from "@/components/ui/layout";
import { ErrorState } from "@/components/ui/states";
import { MembersManager } from "@/components/settings/members-manager";

export default function SettingsMembersPage() {
  const { workspaceId } = useWorkspace();
  return (
    <AgencyGuard>
      <AgencyShell>
        <PageHeader title="Team members" hint="Invite by email, change roles, remove members." />
        {!workspaceId && <ErrorState message="Select a workspace first." />}
        {workspaceId && <MembersManager workspaceId={workspaceId} />}
      </AgencyShell>
    </AgencyGuard>
  );
}
