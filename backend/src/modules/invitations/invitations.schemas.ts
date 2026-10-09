import { z } from "zod";

export const createInvitationSchema = z.object({
  email: z.string().email(),
  type: z.enum(["MEMBER", "CLIENT_PORTAL"]),
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER"]).optional(),
  clientId: z.string().min(1).optional(),
}).superRefine((v, ctx) => {
  if (v.type === "MEMBER" && !v.role) ctx.addIssue({ code: "custom", message: "role is required for MEMBER invitations", path: ["role"] });
  if (v.type === "CLIENT_PORTAL" && !v.clientId) ctx.addIssue({ code: "custom", message: "clientId is required for CLIENT_PORTAL invitations", path: ["clientId"] });
});

export const tokenParamSchema = z.object({ token: z.string().min(1) });
export const idParamSchema = z.object({ id: z.string().min(1) });
