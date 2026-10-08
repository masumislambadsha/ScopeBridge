import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireWorkspaceRole } from '../middleware/rbac';
import * as WS from '../controllers/workspaces.controller';
import * as Users from '../controllers/users.controller';
import * as Clients from '../controllers/clients.controller';
import * as Projects from '../controllers/projects.controller';
import * as IR from '../controllers/infoRequests.controller';
import * as Sub from '../controllers/submissions.controller';
import * as Req from '../controllers/requirements.controller';
import * as Scope from '../controllers/scopes.controller';
import * as Appr from '../controllers/approvals.controller';
import * as Tasks from '../controllers/tasks.controller';
import * as CR from '../controllers/changeRequests.controller';
import * as Msg from '../controllers/messages.controller';
import * as Notif from '../controllers/notifications.controller';
import * as AI from '../controllers/ai.controller';
import { upload } from '../middleware/upload';

const r = Router();
r.use(requireAuth);

// users
r.get('/users', Users.listUsers);
r.get('/users/:id', Users.getUser);
r.patch('/users/:id', Users.patchUser);

// workspaces
r.post('/workspaces', WS.createWorkspace);
r.get('/workspaces', WS.listWorkspaces);
r.get('/workspaces/:id', WS.getWorkspace);
r.patch('/workspaces/:id', requireWorkspaceRole(['ADMIN']), WS.patchWorkspace);
r.delete('/workspaces/:id', requireWorkspaceRole(['ADMIN']), WS.deleteWorkspace);
r.post('/workspaces/:id/members', requireWorkspaceRole(['ADMIN']), WS.addMember);
r.get('/workspaces/:id/members', WS.listMembers);
r.patch('/workspaces/:id/members/:memberId', requireWorkspaceRole(['ADMIN']), WS.patchMember);
r.delete('/workspaces/:id/members/:memberId', requireWorkspaceRole(['ADMIN']), WS.removeMember);

// clients
r.post('/clients', Clients.createClient);
r.get('/clients', Clients.listClients);
r.get('/clients/:id', Clients.getClient);
r.patch('/clients/:id', Clients.patchClient);
r.delete('/clients/:id', Clients.deleteClient);

// projects
r.post('/projects', Projects.createProject);
r.get('/projects', Projects.listProjects);
r.get('/projects/:id', Projects.getProject);
r.patch('/projects/:id', Projects.patchProject);
r.delete('/projects/:id', Projects.deleteProject);
r.get('/dashboard/analytics', Projects.dashboardAnalytics);
r.post('/projects/:projectId/tasks/bulk', Tasks.bulkCreateTasks);

// information requests
r.post('/information-requests', IR.createInfoRequest);
r.get('/information-requests', IR.listInfoRequests);
r.get('/information-requests/:id', IR.getInfoRequest);
r.patch('/information-requests/:id', IR.patchInfoRequest);

// submissions (multipart file -> Cloudinary)
r.post('/submissions', upload.single('file'), Sub.createSubmission);
r.get('/submissions', Sub.listSubmissions);
r.get('/submissions/:id', Sub.getSubmission);

// requirements
r.post('/requirements', Req.createRequirement);
r.get('/requirements', Req.listRequirements);
r.get('/requirements/:id', Req.getRequirement);
r.patch('/requirements/:id', Req.patchRequirement);
r.delete('/requirements/:id', Req.deleteRequirement);
r.post('/requirements/analyze-readiness', Req.triggerReadiness);

// scopes
r.post('/scopes', Scope.createScope);
r.get('/scopes/:id', Scope.getScope);
r.patch('/scopes/:id', Scope.patchScope);
r.post('/scopes/:id/versions', Scope.createVersion);
r.get('/scopes/:id/versions', Scope.listVersions);
r.get('/scope-versions/:id', Scope.getVersion);
r.post('/scopes/:id/request-approval', Scope.requestApproval);

// approvals
r.post('/approvals', Appr.createApproval);
r.get('/approvals', Appr.listApprovals);
r.post('/approvals/:id/approve', Appr.approveApproval);
r.post('/approvals/:id/reject', Appr.rejectApproval);

// tasks
r.post('/tasks', Tasks.createTask);
r.get('/tasks', Tasks.listTasks);
r.get('/tasks/:id', Tasks.getTask);
r.patch('/tasks/:id', Tasks.patchTask);
r.delete('/tasks/:id', Tasks.deleteTask);

// change requests
r.post('/change-requests', upload.single('file'), CR.createChangeRequest);
r.get('/change-requests', CR.listChangeRequests);
r.get('/change-requests/:id', CR.getChangeRequest);
r.patch('/change-requests/:id', CR.patchChangeRequest);
r.post('/change-requests/:id/analyze', CR.analyzeChangeRequest);
r.post('/change-requests/:id/approve', CR.acceptChangeRequest);
r.post('/change-requests/:id/reject', CR.rejectChangeRequest);

// messages
r.post('/messages', Msg.createMessage);
r.get('/messages', Msg.listMessages);

// notifications + activity
r.get('/notifications', Notif.listNotifications);
r.patch('/notifications/:id/read', Notif.markRead);
r.get('/activity', Notif.listActivity);

// AI
r.post('/ai/checklist', AI.postChecklist);
r.post('/ai/extract', AI.postExtract);
r.post('/ai/readiness', AI.postReadiness);
r.post('/ai/acceptance-criteria', AI.postAcceptanceCriteria);
r.post('/ai/scope-analysis', AI.postScopeAnalysis);

export default r;
