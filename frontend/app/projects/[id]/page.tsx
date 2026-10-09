"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSocket } from "@/lib/socket";
import { AgencyShell } from "@/components/shells/agency-shell";
import { AgencyGuard } from "@/components/shells/guards";
import { PageHeader } from "@/components/ui/layout";
import { ListSkeleton, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/dialog";
import { OverviewTab } from "@/components/project/overview-tab";
import { RequestsTab } from "@/components/project/requests-tab";
import { SubmissionsTab } from "@/components/project/submissions-tab";
import { RequirementsTab } from "@/components/project/requirements-tab";
import { ScopeTab } from "@/components/project/scope-tab";
import { TasksTab } from "@/components/project/tasks-tab";
import { ChangeRequestsTab } from "@/components/project/change-requests-tab";
import { MessagesTab } from "@/components/project/messages-tab";
import { ActivityTab } from "@/components/project/activity-tab";
import { useEffect } from "react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "requests", label: "Requests" },
  { id: "submissions", label: "Submissions & Files" },
  { id: "requirements", label: "Requirements" },
  { id: "scope", label: "Scope" },
  { id: "tasks", label: "Tasks" },
  { id: "changes", label: "Change Requests" },
  { id: "messages", label: "Messages" },
  { id: "activity", label: "Activity" },
];

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState("overview");
  const { joinProject } = useSocket();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["project", params.id],
    queryFn: () => api.get<any>(`/api/projects/${params.id}`).then((r) => r.data),
  });

  useEffect(() => {
    joinProject(params.id);
    return () => joinProject(null);
  }, [params.id, joinProject]);

  return (
    <AgencyGuard>
      <AgencyShell>
        {isLoading && <ListSkeleton rows={5} />}
        {error && <ErrorState message="Could not load project." onRetry={() => refetch()} />}
        {data && (
          <>
            <PageHeader title={data.name} hint={`${data.client?.name ?? ""} · ${data.projectType}`} actions={<StatusBadge status={data.status} />} />
            <Tabs tabs={TABS} active={tab} onChange={setTab} />
            <div className="mt-3">
              {tab === "overview" && <OverviewTab projectId={params.id} />}
              {tab === "requests" && <RequestsTab projectId={params.id} />}
              {tab === "submissions" && <SubmissionsTab projectId={params.id} />}
              {tab === "requirements" && <RequirementsTab projectId={params.id} />}
              {tab === "scope" && <ScopeTab projectId={params.id} />}
              {tab === "tasks" && <TasksTab projectId={params.id} />}
              {tab === "changes" && <ChangeRequestsTab projectId={params.id} />}
              {tab === "messages" && <MessagesTab projectId={params.id} />}
              {tab === "activity" && <ActivityTab projectId={params.id} />}
            </div>
          </>
        )}
      </AgencyShell>
    </AgencyGuard>
  );
}
