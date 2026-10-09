import { prisma } from "../../lib/prisma";
import { forbidden, notFound } from "../../core/http";
import { Access } from "../../middleware/access";

export async function analytics(access: Access, workspaceId: string) {
  if (access.kind === "CLIENT") throw forbidden("Use the portal summary instead");
  if (access.workspaceId !== workspaceId) throw notFound("Workspace not found");

  if (access.role === "TEAM_MEMBER") {
    // Team members get a "My work" view.
    const [myTasks, byStatus, upcoming] = await Promise.all([
      prisma.task.count({ where: { assigneeId: access.userId, project: { workspaceId } } }),
      prisma.task.groupBy({ by: ["status"], where: { assigneeId: access.userId, project: { workspaceId } }, _count: true }),
      prisma.task.findMany({
        where: { assigneeId: access.userId, project: { workspaceId }, status: { not: "COMPLETED" }, deadline: { not: null } },
        orderBy: { deadline: "asc" }, take: 10,
        select: { id: true, code: true, title: true, status: true, deadline: true, projectId: true },
      }),
    ]);
    const recent = await prisma.activityLog.findMany({
      where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 10,
      include: { actor: { select: { id: true, name: true } } },
    });
    return { scope: "my-work", myTasks, tasksByStatus: byStatus, upcomingDeadlines: upcoming, recentActivity: recent };
  }

  const [
    totalProjects, activeProjects, totalClients, pendingApprovals,
    totalRequirements, totalTasks, completedTasks, pendingCRs, approvedCRs, rejectedCRs,
    tasksByStatus, crsByStatus, crsByClassification, projectsByStatus, upcomingDeadlines, recentActivity,
  ] = await Promise.all([
    prisma.project.count({ where: { workspaceId } }),
    prisma.project.count({ where: { workspaceId, status: "ACTIVE" } }),
    prisma.client.count({ where: { workspaceId } }),
    prisma.approval.count({ where: { status: "PENDING", scope: { project: { workspaceId } } } }),
    prisma.requirement.count({ where: { project: { workspaceId } } }),
    prisma.task.count({ where: { project: { workspaceId } } }),
    prisma.task.count({ where: { project: { workspaceId }, status: "COMPLETED" } }),
    prisma.changeRequest.count({ where: { project: { workspaceId }, status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
    prisma.changeRequest.count({ where: { project: { workspaceId }, status: "APPROVED" } }),
    prisma.changeRequest.count({ where: { project: { workspaceId }, status: "REJECTED" } }),
    prisma.task.groupBy({ by: ["status"], where: { project: { workspaceId } }, _count: true }),
    prisma.changeRequest.groupBy({ by: ["status"], where: { project: { workspaceId } }, _count: true }),
    prisma.changeRequest.groupBy({ by: ["aiClassification"], where: { project: { workspaceId } }, _count: true }),
    prisma.project.groupBy({ by: ["status"], where: { workspaceId }, _count: true }),
    prisma.task.findMany({
      where: { project: { workspaceId }, status: { not: "COMPLETED" }, deadline: { not: null } },
      orderBy: { deadline: "asc" }, take: 10,
      select: { id: true, code: true, title: true, status: true, deadline: true, projectId: true, assignee: { select: { id: true, name: true } } },
    }),
    prisma.activityLog.findMany({
      where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 15,
      include: { actor: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    scope: "workspace",
    totals: {
      totalProjects, activeProjects, totalClients, pendingApprovals,
      totalRequirements, totalTasks, completedTasks,
      pendingChangeRequests: pendingCRs, approvedChanges: approvedCRs, rejectedChanges: rejectedCRs,
    },
    series: { tasksByStatus, changeRequestsByStatus: crsByStatus, changeRequestsByClassification: crsByClassification, projectsByStatus },
    upcomingDeadlines: upcomingDeadlines,
    recentActivity,
  };
}
