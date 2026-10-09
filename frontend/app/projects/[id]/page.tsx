"use client";
import { use, useState, useEffect } from "react";
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

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState("overview");
  const { joinProject } = useSocket();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get<any>(`/api/projects/${id}`).then((r) => r.data),
  });

  useEffect(() => {
    joinProject(id);
    return () => joinProject(null);
  }, [id, joinProject]);

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
              {tab === "overview" && <OverviewTab projectId={id} />}
              {tab === "requests" && <RequestsTab projectId={id} />}
              {tab === "submissions" && <SubmissionsTab projectId={id} />}
              {tab === "requirements" && <RequirementsTab projectId={id} />}
              {tab === "scope" && <ScopeTab projectId={id} />}
              {tab === "tasks" && <TasksTab projectId={id} />}
              {tab === "changes" && <ChangeRequestsTab projectId={id} />}
              {tab === "messages" && <MessagesTab projectId={id} />}
              {tab === "activity" && <ActivityTab projectId={id} />}
            </div>
          </>
        )}
      </AgencyShell>
    </AgencyGuard>
  );
}
