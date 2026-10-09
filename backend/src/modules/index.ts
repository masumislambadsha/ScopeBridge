import { Router } from "express";
import usersRoutes from "./users/users.routes";
import workspacesRoutes from "./workspaces/workspaces.routes";
import invitationsRoutes from "./invitations/invitations.routes";
import clientsRoutes from "./clients/clients.routes";
import projectsRoutes from "./projects/projects.routes";
import portalRoutes from "./portal/portal.routes";
import irRoutes from "./information-requests/information-requests.routes";
import submissionsRoutes from "./submissions/submissions.routes";
import filesRoutes from "./files/files.routes";
import requirementsRoutes from "./requirements/requirements.routes";
import scopesRoutes from "./scopes/scopes.routes";
import approvalsRoutes from "./approvals/approvals.routes";
import tasksRoutes from "./tasks/tasks.routes";
import crRoutes from "./change-requests/change-requests.routes";
import messagesRoutes from "./messages/messages.routes";
import notificationsRoutes from "./notifications/notifications.routes";
import dashboardRoutes from "./dashboard/dashboard.routes";
import aiRoutes from "./ai/ai.routes";
import traceabilityRoutes from "./traceability/traceability.routes";

const r = Router();

// NOTE: auth routes mount separately at /api/auth (see app.ts).
r.use(usersRoutes);
r.use(workspacesRoutes);
r.use(invitationsRoutes);
r.use(clientsRoutes);
r.use(projectsRoutes);
r.use(portalRoutes);
r.use(irRoutes);
r.use(submissionsRoutes);
r.use(filesRoutes);
r.use(requirementsRoutes);
r.use(scopesRoutes);
r.use(approvalsRoutes);
r.use(tasksRoutes);
r.use(crRoutes);
r.use(messagesRoutes);
r.use(notificationsRoutes);
r.use(dashboardRoutes);
r.use(aiRoutes);
r.use(traceabilityRoutes);

export default r;
