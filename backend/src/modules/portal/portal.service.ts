import { prisma } from "../../lib/prisma";
import { notFound, forbidden } from "../../core/http";
import { projectDTO, requirementDTO, scopeVersionDTO, approvalDTO, taskProgressDTO, messageDTO, senderDTO, changeRequestDTO } from "../../core/dto";
import { getProjectAccess, type Access } from "../../middleware/access";

async function taskProgress(projectId: string) {
  const [total, completed] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, status: "COMPLETED" } }),
  ]);
  return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
}

export async function portalProjects(userId: string) {
  const clients = await prisma.client.findMany({
    where: { portalUserId: userId },
    include: { projects: { include: { client: { select: { id: true, name: true, company: true } } }, orderBy: { createdAt: "desc" } } },
  });
  const out = [];
  for (const c of clients) {
    for (const p of c.projects) {
      out.push({ ...projectDTO({ ...p, client: p.client }), progress: await taskProgress(p.id) });
    }
  }
  return out;
}

export async function portalProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: { select: { id: true, name: true, company: true } },
      informationRequests: { where: { status: { in: ["SENT", "ANSWERED"] } }, orderBy: { createdAt: "desc" } },
      requirements: { where: { status: { in: ["READY", "APPROVED", "NEEDS_CLARIFICATION"] } }, orderBy: { code: "asc" } },
      scope: { include: { versions: { where: { status: { not: "DRAFT" } }, orderBy: { version: "desc" } } } },
      messages: { where: { visibility: "CLIENT" }, orderBy: { createdAt: "desc" }, take: 20, include: { sender: { select: { id: true, name: true } } } },
      changeRequests: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) throw notFound("Project not found");
  const client = await prisma.client.findFirst({ where: { id: project.clientId, portalUserId: userId } });
  if (!client) throw notFound("Project not found");
  const progress = await taskProgress(project.id);
  const tasks = await prisma.task.findMany({ where: { projectId }, select: { id: true, code: true, title: true, status: true, priority: true, deadline: true } });
  const approvals = await prisma.approval.findMany({
    where: { scope: { projectId }, clientId: client.id },
    orderBy: { createdAt: "desc" },
    include: { scopeVersion: { select: { id: true, version: true, status: true } } },
  });
  return {
    ...projectDTO({ ...project, client: project.client }),
    progress,
    informationRequests: project.informationRequests,
    requirements: project.requirements.map((r) => requirementDTO(r as unknown as Record<string, unknown>)),
    scopeVersions: (project.scope?.versions ?? []).map((v) => scopeVersionDTO(v as unknown as Record<string, unknown>)),
    approvals: approvals.map((a) => approvalDTO(a as unknown as Record<string, unknown>)),
    tasks: tasks.map((t) => taskProgressDTO(t as unknown as Record<string, unknown>)),
    messages: project.messages.map((m) => messageDTO({ ...m, sender: senderDTO(m.sender as unknown as Record<string, unknown>) })),
    changeRequests: project.changeRequests.map((c) => changeRequestDTO(c as unknown as Record<string, unknown>)),
  };
}

export async function resolvePortalAccess(userId: string): Promise<Access> {
  const client = await prisma.client.findFirst({ where: { portalUserId: userId } });
  if (!client) throw forbidden("Portal access only");
  return { kind: "CLIENT", userId, workspaceId: client.workspaceId, clientId: client.id };
}

export function assertPortal(access: Access) {
  if (access.kind !== "CLIENT") throw forbidden("Portal access only");
}
