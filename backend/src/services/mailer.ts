import net from "net";
import { env } from "../config/env";
import { logger } from "../core/logger";
import { emailQueue } from "../queues/queues";

export type EmailTemplate =
  | "invitation" | "portal-invite" | "password-reset" | "ir-sent" | "reminder"
  | "approval-requested" | "scope-decided" | "cr-decided";

export interface EmailJob {
  to: string;
  template: EmailTemplate;
  data: Record<string, string>;
}

const SUBJECTS: Record<EmailTemplate, string> = {
  invitation: "You are invited to join a ScopeBridge workspace",
  "portal-invite": "You are invited to the ScopeBridge client portal",
  "password-reset": "Reset your ScopeBridge password",
  "ir-sent": "New information request needs your answers",
  reminder: "Reminder: action needed on ScopeBridge",
  "approval-requested": "A scope is waiting for your approval",
  "scope-decided": "A scope decision was made",
  "cr-decided": "Update on your change request",
};

export function renderEmail(template: EmailTemplate, d: Record<string, string>): { subject: string; html: string } {
  const link = (url: string, label: string) =>
    `<p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#18181b;color:#fff;border-radius:6px;text-decoration:none">${label}</a></p><p style="color:#71717a;font-size:12px">${url}</p>`;
  const wrap = (title: string, body: string) =>
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto"><h2>${title}</h2>${body}<hr/><p style="color:#71717a;font-size:12px">ScopeBridge — scope management without the creep.</p></div>`;
  const appUrl = env.frontendOrigins[0] ?? "http://localhost:3000";
  switch (template) {
    case "invitation":
      return { subject: SUBJECTS.invitation, html: wrap("Workspace invitation", `<p>${d.inviterName ?? "Someone"} invited you to join <b>${d.workspaceName ?? "a workspace"}</b> as <b>${d.role ?? "member"}</b>.</p>` + link(`${appUrl}/invite/${d.token ?? ""}`, "Accept invitation")) };
    case "portal-invite":
      return { subject: SUBJECTS["portal-invite"], html: wrap("Client portal invitation", `<p><b>${d.workspaceName ?? "Your agency"}</b> invited you to the client portal${d.clientName ? ` for <b>${d.clientName}</b>` : ""}.</p>` + link(`${appUrl}/invite/${d.token ?? ""}`, "Open client portal")) };
    case "password-reset":
      return { subject: SUBJECTS["password-reset"], html: wrap("Password reset", `<p>Click below to reset your password. The link expires in 1 hour.</p>` + link(`${appUrl}/reset-password?token=${d.token ?? ""}`, "Reset password")) };
    case "ir-sent":
      return { subject: SUBJECTS["ir-sent"], html: wrap("New information request", `<p><b>${d.title ?? "An information request"}</b> needs your answers${d.deadline ? ` by <b>${d.deadline}</b>` : ""}.</p>` + link(`${appUrl}/portal/projects/${d.projectId ?? ""}/requests/${d.requestId ?? ""}`, "Answer now")) };
    case "reminder":
      return { subject: SUBJECTS.reminder, html: wrap("Reminder", `<p>${d.message ?? "Something needs your attention."}</p>` + (d.link ? link(d.link.startsWith("http") ? d.link : `${appUrl}${d.link}`, "Open") : "")) };
    case "approval-requested":
      return { subject: SUBJECTS["approval-requested"], html: wrap("Scope approval requested", `<p>Scope version <b>v${d.version ?? "?"}</b> for <b>${d.projectName ?? "your project"}</b> is waiting for your review.</p>` + link(`${appUrl}/portal/projects/${d.projectId ?? ""}/scope`, "Review scope")) };
    case "scope-decided":
      return { subject: SUBJECTS["scope-decided"], html: wrap("Scope decision", `<p>Scope version <b>v${d.version ?? "?"}</b> was <b>${d.decision ?? ""}</b>${d.comment ? `: “${d.comment}”` : ""}.</p>`) };
    case "cr-decided":
      return { subject: SUBJECTS["cr-decided"], html: wrap("Change request update", `<p>Your change request <b>${d.code ?? ""} — ${d.title ?? ""}</b> was <b>${d.decision ?? ""}</b>${d.note ? `: ${d.note}` : ""}.</p>`) };
  }
}

/** Enqueue an email (spec: all email goes through the `email` queue). */
export async function queueEmail(to: string, template: EmailTemplate, data: Record<string, string>): Promise<void> {
  if (!env.MAIL_ENABLED) {
    logger.info("[mailer] disabled, skipping", { to, template });
    return;
  }
  await emailQueue.add("send", { to, template, data } satisfies EmailJob);
}

interface Transport {
  send(to: string, subject: string, html: string): Promise<void>;
}

async function nodemailerTransport(): Promise<Transport | null> {
  const { optionalImport } = await import("../core/http");
  const nodemailer = (await optionalImport("nodemailer")) as {
    createTransport: (opts: Record<string, unknown>) => { sendMail: (msg: Record<string, unknown>) => Promise<unknown> };
  } | null;
  if (!nodemailer) return null; // D-09 fallback below
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    tls: env.SMTP_PORT === 465 || env.isProd ? undefined : { rejectUnauthorized: false },
  });
  return { send: (to, subject, html) => transporter.sendMail({ from: env.SMTP_FROM, to, subject, html }).then(() => undefined) };
}

/** Minimal built-in SMTP client (plain + AUTH LOGIN, no TLS) for Mailpit/local dev. */
function rawSmtpTransport(): Transport {
  function chat(socket: net.Socket, cmd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let buf = "";
      const onData = (d: Buffer) => {
        buf += d.toString();
        if (/\r\n$/.test(buf)) {
          socket.off("data", onData);
          const code = parseInt(buf.slice(0, 3), 10);
          if (code >= 400) reject(new Error(`SMTP error: ${buf.trim()}`));
          else resolve(buf);
        }
      };
      socket.on("data", onData);
      socket.on("error", reject);
      if (cmd) socket.write(cmd + "\r\n");
    });
  }
  return {
    send: async (to, subject, html) => {
      const socket = net.connect(env.SMTP_PORT, env.SMTP_HOST);
      try {
        await chat(socket);
        await chat(socket, `EHLO scopebridge`);
        if (env.SMTP_USER) {
          await chat(socket, "AUTH LOGIN");
          await chat(socket, Buffer.from(env.SMTP_USER).toString("base64"));
          await chat(socket, Buffer.from(env.SMTP_PASS).toString("base64"));
        }
        const from = /<(.+)>/.exec(env.SMTP_FROM)?.[1] ?? env.SMTP_FROM;
        await chat(socket, `MAIL FROM:<${from}>`);
        await chat(socket, `RCPT TO:<${to}>`);
        await chat(socket, "DATA");
        const body = [
          `From: ${env.SMTP_FROM}`, `To: ${to}`, `Subject: ${subject}`,
          "MIME-Version: 1.0", 'Content-Type: text/html; charset="utf-8"', "", html, ".",
        ].join("\r\n");
        socket.write(body + "\r\n");
        await chat(socket);
        socket.write("QUIT\r\n");
        socket.end();
      } catch (err) {
        socket.destroy();
        throw err;
      }
    },
  };
}

/** Worker entry: deliver one queued email. */
export async function deliverEmail(job: EmailJob): Promise<void> {
  const { subject, html } = renderEmail(job.template, job.data);
  const transport = (await nodemailerTransport()) ?? rawSmtpTransport();
  await transport.send(job.to, subject, html);
  logger.info("[mailer] sent", { to: job.to, template: job.template });
}
