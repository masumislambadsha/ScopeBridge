"use client";
import { useWorkspace } from "@/lib/workspace";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { PageHeader } from "@/components/ui/layout";
import { ErrorState } from "@/components/ui/states";
import { ActivityTab } from "@/components/project/activity-tab";

export default function ActivityPage() {
  const { workspaceId } = useWorkspace();
  return (
    <AgencyGuard>
      <AgencyShell>
        <PageHeader title="Workspace activity" />
        {!workspaceId && <ErrorState message="Select a workspace first." />}
        {workspaceId && <ActivityTab workspaceId={workspaceId} />}
      </AgencyShell>
    </AgencyGuard>
  );
}
