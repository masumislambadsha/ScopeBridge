import { prisma } from "../../lib/prisma";
import { conflict, forbidden, notFound } from "../../core/http";
import { paged, paginate } from "../../core/pagination";
import { Access } from "../../middleware/access";
import { audit } from "../../services/audit";
import { createInvitation } from "../invitations/invitations.service";

export async function createClient(access: Access, actorId: string, input: Record<string, string>) {
  if (access.kind !== "MEMBER") throw forbidden("Insufficient permission");
  const exists = await prisma.client.findUnique({
    where: { workspaceId_email: { workspaceId: access.workspaceId, email: input.email.toLowerCase() } },
  });
  if (exists) throw conflict("A client with this email already exists in the workspace");
  const client = await prisma.client.create({
    data: {
      workspaceId: access.workspaceId,
      name: input.name, email: input.email.toLowerCase(),
      company: input.company, phone: input.phone, contactName: input.contactName,
      address: input.address, notes: input.notes,
    },
  });
  await audit({ workspaceId: access.workspaceId, actorId, action: "client.created", entityType: "Client", entityId: client.id });
  return client;
}

export async function listClients(access: Access, q: { search?: string; status?: "ACTIVE" | "INACTIVE" | "ARCHIVED"; page: number; limit: number }) {
  if (access.kind !== "MEMBER") throw forbidden("Insufficient permission");
  const search = q.search?.trim();
  const where = {
    workspaceId: access.workspaceId,
    ...(q.status ? { status: q.status } : {}),
    ...(search ? { OR: [
      { name: { contains: search, mode: "insensitive" as const } },
      { email: { contains: search, mode: "insensitive" as const } },
      { company: { contains: search, mode: "insensitive" as const } },
    ] } : {}),
  };
  const { page, limit, skip, take } = paginate(q);
  const [total, data] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where, skip, take, orderBy: { createdAt: "desc" },
      include: { _count: { select: { projects: true } } },
    }),
  ]);
  return paged(data, total, page, limit);
}

export async function getClient(access: Access, id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: { select: { id: true, name: true, status: true, deadline: true } },
    },
  });
  if (!client || client.workspaceId !== access.workspaceId) throw notFound("Client not found");
  if (access.kind === "CLIENT" && access.clientId !== client.id) throw notFound("Client not found");
  return client;
}

export async function patchClient(access: Access, actorId: string, id: string, data: Record<string, string | null>) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing || existing.workspaceId !== access.workspaceId) throw notFound("Client not found");
  try {
    const client = await prisma.client.update({ where: { id }, data: data as never });
    await audit({ workspaceId: access.workspaceId, actorId, action: "client.updated", entityType: "Client", entityId: id, metadata: { changed: Object.keys(data) } });
    return client;
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") throw conflict("A client with this email already exists in the workspace");
    throw e;
  }
}

export async function deleteClient(access: Access, actorId: string, id: string) {
  const existing = await prisma.client.findUnique({ where: { id }, include: { _count: { select: { projects: true } } } });
  if (!existing || existing.workspaceId !== access.workspaceId) throw notFound("Client not found");
  if (existing._count.projects > 0) throw conflict("Client has projects and cannot be deleted (archive it instead)");
  await prisma.client.delete({ where: { id } });
  await audit({ workspaceId: access.workspaceId, actorId, action: "client.deleted", entityType: "Client", entityId: id });
  return { ok: true };
}

/** "Invite to portal" — sends a CLIENT_PORTAL invitation; accepting sets portalUserId. */
export async function inviteToPortal(access: Access, actorId: string, id: string) {
  if (access.kind !== "MEMBER") throw forbidden("Insufficient permission");
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client || client.workspaceId !== access.workspaceId) throw notFound("Client not found");
  return createInvitation(actorId, access.workspaceId, { email: client.email, type: "CLIENT_PORTAL", clientId: id });
}
