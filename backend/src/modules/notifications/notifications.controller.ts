import { Response, NextFunction } from "express";
import { AccessRequest, getProjectAccess, getWorkspaceAccess } from "../../middleware/access";
import { amw, notFound, okBody } from "../../core/http";
import * as S from "./notifications.service";

export const resolveActivityAccess = amw(async (req: AccessRequest, _res: Response, next: NextFunction) => {
  const q = req.query as { projectId?: string; workspaceId?: string };
  if (q.projectId) {
    const access = await getProjectAccess(req.userId!, q.projectId);
    if (!access) throw notFound("Project not found");
    req.access = access;
  } else if (q.workspaceId) {
    const access = await getWorkspaceAccess(req.userId!, q.workspaceId);
    if (!access) throw notFound("Workspace not found");
    req.access = access;
  } else {
    throw notFound("Provide workspaceId or projectId");
  }
  next();
});

export async function list(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { unread?: string; page: number; limit: number };
  const { data, meta } = await S.listNotifications(req.userId!, q);
  res.json(okBody(data, meta));
}

export async function markRead(req: AccessRequest, res: Response) {
  res.json(okBody(await S.markRead(req.userId!, req.params.id)));
}

export async function markAllRead(req: AccessRequest, res: Response) {
  res.json(okBody(await S.markAllRead(req.userId!)));
}

export async function activity(req: AccessRequest, res: Response) {
  const q = req.query as unknown as { workspaceId?: string; projectId?: string; action?: string; entityType?: string; page: number; limit: number };
  const { data, meta } = await S.listActivity(req.access!, q);
  res.json(okBody(data, meta));
}
