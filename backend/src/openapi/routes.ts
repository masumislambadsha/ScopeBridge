import { z } from "zod";
import { doc } from "./document";
import { registerSchema, loginSchema, forgotSchema, resetSchema } from "../modules/auth/auth.schemas";
import { usersQuerySchema, userIdParamSchema, patchUserSchema } from "../modules/users/users.schemas";
import {
  createWorkspaceSchema, patchWorkspaceSchema, workspaceListSchema,
  workspaceIdParam, addMemberSchema, patchMemberSchema, memberIdParam,
} from "../modules/workspaces/workspaces.schemas";
import { createInvitationSchema, tokenParamSchema, idParamSchema } from "../modules/invitations/invitations.schemas";
import { createClientSchema, patchClientSchema, clientsQuerySchema, clientIdParam } from "../modules/clients/clients.schemas";
import {
  createProjectSchema, patchProjectSchema, projectsQuerySchema,
  projectIdParam, addProjectMemberSchema, projectMemberParam,
} from "../modules/projects/projects.schemas";
import {
  createIRSchema, patchIRSchema, irQuerySchema, irIdParam, clarifySchema,
} from "../modules/information-requests/information-requests.schemas";
import { submissionsQuerySchema, submissionIdParam } from "../modules/submissions/submissions.schemas";
import { filesQuerySchema, fileIdParam } from "../modules/files/files.schemas";
import {
  createRequirementSchema, patchRequirementSchema, requirementsQuerySchema,
  requirementIdParam, markSchema,
} from "../modules/requirements/requirements.schemas";
import {
  createScopeSchema, patchVersionSchema, scopesQuerySchema,
  scopeIdParam, createVersionSchema, compareQuerySchema,
} from "../modules/scopes/scopes.schemas";
import {
  createApprovalSchema, decideSchema, requestChangesSchema,
  approvalsQuerySchema, approvalIdParam,
} from "../modules/approvals/approvals.schemas";
import {
  createTaskSchema, patchTaskSchema, tasksQuerySchema,
  taskIdParam, generateTasksSchema, bulkTasksSchema,
} from "../modules/tasks/tasks.schemas";
import {
  patchCRSchema, crsQuerySchema, crIdParam,
  approveCRSchema, rejectCRSchema,
} from "../modules/change-requests/change-requests.schemas";
import { createMessageSchema, messagesQuerySchema } from "../modules/messages/messages.schemas";
import { notificationsQuerySchema, notificationIdParam, activityQuerySchema } from "../modules/notifications/notifications.schemas";
import { analyticsQuerySchema } from "../modules/dashboard/dashboard.schemas";
import {
  checklistSchema, extractSchema, readinessSchema, acceptanceSchema,
  scopeAnalysisSchema, aiRunIdParam,
} from "../modules/ai/ai.schemas";

const idParam = (name: string) => z.object({ [name]: z.string().min(1) } as Record<string, z.ZodString>);

/** Every Express route must appear here — CI `openapi:check` enforces it. */
export function registerRoutes() {
  // Auth
  doc({ method: "post", path: "/api/auth/register", tags: ["auth"], summary: "Register", body: registerSchema, auth: false });
  doc({ method: "post", path: "/api/auth/login", tags: ["auth"], summary: "Login", body: loginSchema, auth: false });
  doc({ method: "post", path: "/api/auth/logout", tags: ["auth"], summary: "Logout" });
  doc({ method: "post", path: "/api/auth/refresh", tags: ["auth"], summary: "Refresh session" });
  doc({ method: "post", path: "/api/auth/forgot-password", tags: ["auth"], summary: "Forgot password", body: forgotSchema, auth: false });
  doc({ method: "post", path: "/api/auth/reset-password", tags: ["auth"], summary: "Reset password", body: resetSchema, auth: false });
  doc({ method: "get", path: "/api/auth/me", tags: ["auth"], summary: "Current user + memberships + portal access" });

  // Users
  doc({ method: "get", path: "/api/users", tags: ["users"], summary: "List workspace members", query: usersQuerySchema });
  doc({ method: "get", path: "/api/users/:id", tags: ["users"], summary: "Get user", params: userIdParamSchema });
  doc({ method: "patch", path: "/api/users/:id", tags: ["users"], summary: "Update own profile", params: userIdParamSchema, body: patchUserSchema });

  // Workspaces
  doc({ method: "post", path: "/api/workspaces", tags: ["workspaces"], summary: "Create workspace", body: createWorkspaceSchema });
  doc({ method: "get", path: "/api/workspaces", tags: ["workspaces"], summary: "List my workspaces", query: workspaceListSchema });
  doc({ method: "get", path: "/api/workspaces/:id", tags: ["workspaces"], summary: "Get workspace", params: workspaceIdParam });
  doc({ method: "patch", path: "/api/workspaces/:id", tags: ["workspaces"], summary: "Update workspace", params: workspaceIdParam, body: patchWorkspaceSchema });
  doc({ method: "delete", path: "/api/workspaces/:id", tags: ["workspaces"], summary: "Delete workspace", params: workspaceIdParam });
  doc({ method: "post", path: "/api/workspaces/:id/members", tags: ["workspaces"], summary: "Add member by email", params: workspaceIdParam, body: addMemberSchema });
  doc({ method: "get", path: "/api/workspaces/:id/members", tags: ["workspaces"], summary: "List members", params: workspaceIdParam });
  doc({ method: "patch", path: "/api/workspaces/:id/members/:memberId", tags: ["workspaces"], summary: "Change member role", params: memberIdParam, body: patchMemberSchema });
  doc({ method: "delete", path: "/api/workspaces/:id/members/:memberId", tags: ["workspaces"], summary: "Remove member", params: memberIdParam });

  // Invitations
  doc({ method: "post", path: "/api/workspaces/:id/invitations", tags: ["invitations"], summary: "Invite member/portal user", params: workspaceIdParam, body: createInvitationSchema });
  doc({ method: "get", path: "/api/workspaces/:id/invitations", tags: ["invitations"], summary: "List pending invitations", params: workspaceIdParam });
  doc({ method: "delete", path: "/api/workspaces/:id/invitations/:invId", tags: ["invitations"], summary: "Revoke invitation", params: idParam("id").extend({ invId: z.string() }) });
  doc({ method: "get", path: "/api/invitations/:token", tags: ["invitations"], summary: "Preview invitation", params: tokenParamSchema, auth: false });
  doc({ method: "post", path: "/api/invitations/:token/accept", tags: ["invitations"], summary: "Accept invitation", params: tokenParamSchema });
  doc({ method: "delete", path: "/api/invitations/:id", tags: ["invitations"], summary: "Revoke invitation", params: idParamSchema });

  // Clients
  doc({ method: "post", path: "/api/clients", tags: ["clients"], summary: "Create client", body: createClientSchema });
  doc({ method: "get", path: "/api/clients", tags: ["clients"], summary: "List clients", query: clientsQuerySchema });
  doc({ method: "get", path: "/api/clients/:id", tags: ["clients"], summary: "Get client", params: clientIdParam });
  doc({ method: "patch", path: "/api/clients/:id", tags: ["clients"], summary: "Update client", params: clientIdParam, body: patchClientSchema });
  doc({ method: "delete", path: "/api/clients/:id", tags: ["clients"], summary: "Delete client", params: clientIdParam });
  doc({ method: "post", path: "/api/clients/:id/portal-invite", tags: ["clients"], summary: "Invite client to portal", params: clientIdParam });

  // Projects
  doc({ method: "post", path: "/api/projects", tags: ["projects"], summary: "Create project", body: createProjectSchema });
  doc({ method: "get", path: "/api/projects", tags: ["projects"], summary: "List projects", query: projectsQuerySchema });
  doc({ method: "get", path: "/api/projects/:id", tags: ["projects"], summary: "Get project", params: projectIdParam });
  doc({ method: "patch", path: "/api/projects/:id", tags: ["projects"], summary: "Update project", params: projectIdParam, body: patchProjectSchema });
  doc({ method: "delete", path: "/api/projects/:id", tags: ["projects"], summary: "Delete project", params: projectIdParam });
  doc({ method: "get", path: "/api/projects/:id/members", tags: ["projects"], summary: "List project members", params: projectIdParam });
  doc({ method: "post", path: "/api/projects/:id/members", tags: ["projects"], summary: "Add project member", params: projectIdParam, body: addProjectMemberSchema });
  doc({ method: "delete", path: "/api/projects/:id/members/:userId", tags: ["projects"], summary: "Remove project member", params: projectMemberParam });
  doc({ method: "get", path: "/api/projects/:id/traceability", tags: ["projects"], summary: "Traceability chain", params: projectIdParam });

  // Portal
  doc({ method: "get", path: "/api/portal/projects", tags: ["portal"], summary: "Client projects + progress" });
  doc({ method: "get", path: "/api/portal/projects/:id", tags: ["portal"], summary: "Client project detail", params: projectIdParam });

  // Information requests
  doc({ method: "post", path: "/api/information-requests", tags: ["information-requests"], summary: "Create request", body: createIRSchema });
  doc({ method: "get", path: "/api/information-requests", tags: ["information-requests"], summary: "List requests", query: irQuerySchema });
  doc({ method: "get", path: "/api/information-requests/:id", tags: ["information-requests"], summary: "Get request", params: irIdParam });
  doc({ method: "patch", path: "/api/information-requests/:id", tags: ["information-requests"], summary: "Update draft request", params: irIdParam, body: patchIRSchema });
  doc({ method: "post", path: "/api/information-requests/:id/send", tags: ["information-requests"], summary: "Send to client", params: irIdParam });
  doc({ method: "post", path: "/api/requirements/request-clarification", tags: ["requirements"], summary: "Request clarification", body: clarifySchema });

  // Submissions
  doc({ method: "post", path: "/api/submissions", tags: ["submissions"], summary: "Submit answers + files" });
  doc({ method: "get", path: "/api/submissions", tags: ["submissions"], summary: "List submissions", query: submissionsQuerySchema });
  doc({ method: "get", path: "/api/submissions/:id", tags: ["submissions"], summary: "Get submission", params: submissionIdParam });

  // Files
  doc({ method: "post", path: "/api/files", tags: ["files"], summary: "Upload files" });
  doc({ method: "get", path: "/api/files", tags: ["files"], summary: "List files", query: filesQuerySchema });
  doc({ method: "get", path: "/api/files/:id/download", tags: ["files"], summary: "Download file", params: fileIdParam });

  // Requirements
  doc({ method: "post", path: "/api/requirements", tags: ["requirements"], summary: "Create requirement", body: createRequirementSchema });
  doc({ method: "get", path: "/api/requirements", tags: ["requirements"], summary: "List requirements", query: requirementsQuerySchema });
  doc({ method: "get", path: "/api/requirements/:id", tags: ["requirements"], summary: "Get requirement", params: requirementIdParam });
  doc({ method: "patch", path: "/api/requirements/:id", tags: ["requirements"], summary: "Update requirement", params: requirementIdParam, body: patchRequirementSchema });
  doc({ method: "delete", path: "/api/requirements/:id", tags: ["requirements"], summary: "Delete requirement", params: requirementIdParam });
  doc({ method: "post", path: "/api/requirements/:id/approve", tags: ["requirements"], summary: "Approve requirement", params: requirementIdParam });
  doc({ method: "post", path: "/api/requirements/mark", tags: ["requirements"], summary: "Bulk mark ready/needs-clarification", body: markSchema });
  doc({ method: "get", path: "/api/projects/:projectId/readiness", tags: ["requirements"], summary: "Latest readiness report", params: idParam("projectId") });

  // Scopes
  doc({ method: "post", path: "/api/scopes", tags: ["scopes"], summary: "Create scope + v1 draft", body: createScopeSchema });
  doc({ method: "get", path: "/api/scopes", tags: ["scopes"], summary: "List scopes", query: scopesQuerySchema });
  doc({ method: "get", path: "/api/scopes/:id", tags: ["scopes"], summary: "Get scope", params: scopeIdParam });
  doc({ method: "post", path: "/api/scopes/:id/versions", tags: ["scopes"], summary: "Create new draft version", params: scopeIdParam, body: createVersionSchema });
  doc({ method: "get", path: "/api/scopes/:id/versions", tags: ["scopes"], summary: "List versions", params: scopeIdParam });
  doc({ method: "get", path: "/api/scopes/:id/compare", tags: ["scopes"], summary: "Compare versions", params: scopeIdParam, query: compareQuerySchema });
  doc({ method: "post", path: "/api/scopes/:id/request-approval", tags: ["approvals"], summary: "Send open draft for approval", params: scopeIdParam });
  doc({ method: "get", path: "/api/scope-versions/:id", tags: ["scopes"], summary: "Get version", params: scopeIdParam });
  doc({ method: "patch", path: "/api/scope-versions/:id", tags: ["scopes"], summary: "Edit draft version", params: scopeIdParam, body: patchVersionSchema });

  // Approvals
  doc({ method: "post", path: "/api/approvals", tags: ["approvals"], summary: "Request approval for version", body: createApprovalSchema });
  doc({ method: "get", path: "/api/approvals", tags: ["approvals"], summary: "List approvals", query: approvalsQuerySchema });
  doc({ method: "get", path: "/api/approvals/:id", tags: ["approvals"], summary: "Get approval", params: approvalIdParam });
  doc({ method: "post", path: "/api/approvals/:id/approve", tags: ["approvals"], summary: "Approve (client)", params: approvalIdParam, body: decideSchema });
  doc({ method: "post", path: "/api/approvals/:id/reject", tags: ["approvals"], summary: "Reject (client)", params: approvalIdParam, body: decideSchema });
  doc({ method: "post", path: "/api/approvals/:id/request-changes", tags: ["approvals"], summary: "Request changes (client)", params: approvalIdParam, body: requestChangesSchema });

  // Tasks
  doc({ method: "post", path: "/api/tasks", tags: ["tasks"], summary: "Create task (firewall-checked)", body: createTaskSchema });
  doc({ method: "get", path: "/api/tasks", tags: ["tasks"], summary: "List tasks", query: tasksQuerySchema });
  doc({ method: "get", path: "/api/tasks/mine", tags: ["tasks"], summary: "My tasks" });
  doc({ method: "get", path: "/api/tasks/:id", tags: ["tasks"], summary: "Get task", params: taskIdParam });
  doc({ method: "patch", path: "/api/tasks/:id", tags: ["tasks"], summary: "Update task", params: taskIdParam, body: patchTaskSchema });
  doc({ method: "delete", path: "/api/tasks/:id", tags: ["tasks"], summary: "Delete task", params: taskIdParam });
  doc({ method: "get", path: "/api/scope-versions/:id/generate-tasks", tags: ["tasks"], summary: "Preview generated tasks", params: taskIdParam, query: generateTasksSchema });
  doc({ method: "post", path: "/api/projects/:projectId/tasks/bulk", tags: ["tasks"], summary: "Bulk create tasks", params: idParam("projectId"), body: bulkTasksSchema });

  // Change requests
  doc({ method: "post", path: "/api/change-requests", tags: ["change-requests"], summary: "Submit change request" });
  doc({ method: "get", path: "/api/change-requests", tags: ["change-requests"], summary: "List change requests", query: crsQuerySchema });
  doc({ method: "get", path: "/api/change-requests/:id", tags: ["change-requests"], summary: "Get change request", params: crIdParam });
  doc({ method: "patch", path: "/api/change-requests/:id", tags: ["change-requests"], summary: "Review change request", params: crIdParam, body: patchCRSchema });
  doc({ method: "post", path: "/api/change-requests/:id/analyze", tags: ["change-requests"], summary: "Queue AI analysis", params: crIdParam });
  doc({ method: "post", path: "/api/change-requests/:id/approve", tags: ["change-requests"], summary: "Approve change request", params: crIdParam, body: approveCRSchema });
  doc({ method: "post", path: "/api/change-requests/:id/reject", tags: ["change-requests"], summary: "Reject change request", params: crIdParam, body: rejectCRSchema });
  doc({ method: "post", path: "/api/change-requests/:id/implement", tags: ["change-requests"], summary: "Mark implemented", params: crIdParam });

  // Messages
  doc({ method: "post", path: "/api/messages", tags: ["messages"], summary: "Send message", body: createMessageSchema });
  doc({ method: "get", path: "/api/messages", tags: ["messages"], summary: "List messages", query: messagesQuerySchema });

  // Notifications + activity
  doc({ method: "get", path: "/api/notifications", tags: ["notifications"], summary: "List notifications", query: notificationsQuerySchema });
  doc({ method: "patch", path: "/api/notifications/read-all", tags: ["notifications"], summary: "Mark all read" });
  doc({ method: "patch", path: "/api/notifications/:id/read", tags: ["notifications"], summary: "Mark read", params: notificationIdParam });
  doc({ method: "get", path: "/api/activity", tags: ["activity"], summary: "Activity log", query: activityQuerySchema });

  // Dashboard
  doc({ method: "get", path: "/api/dashboard/analytics", tags: ["dashboard"], summary: "Analytics", query: analyticsQuerySchema });

  // AI
  doc({ method: "post", path: "/api/ai/checklist", tags: ["ai"], summary: "AI-01 checklist", body: checklistSchema });
  doc({ method: "post", path: "/api/ai/extract", tags: ["ai"], summary: "AI-02 extraction", body: extractSchema });
  doc({ method: "post", path: "/api/ai/readiness", tags: ["ai"], summary: "AI-03 readiness", body: readinessSchema });
  doc({ method: "post", path: "/api/ai/acceptance-criteria", tags: ["ai"], summary: "AI-04 criteria", body: acceptanceSchema });
  doc({ method: "post", path: "/api/ai/scope-analysis", tags: ["ai"], summary: "AI-05 change analysis", body: scopeAnalysisSchema });
  doc({ method: "get", path: "/api/ai/runs/:id", tags: ["ai"], summary: "AI run status", params: aiRunIdParam });
}
