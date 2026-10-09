import { Job } from "bullmq";
import { inflateRawSync, inflateSync } from "zlib";
import fs from "fs";
import { prisma } from "../../lib/prisma";
import { logger } from "../../core/logger";
import { localFilePath } from "../../services/storage";
import { env } from "../../config/env";

const MAX_TEXT = 200_000;

async function readBytes(storageKey: string, url: string | null): Promise<Buffer | null> {
  try {
    if (env.STORAGE_DRIVER === "local") return await fs.promises.readFile(localFilePath(storageKey));
    if (url) {
      const res = await fetch(url);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    }
  } catch (e) {
    logger.warn("[files] read failed", { err: String(e) });
  }
  return null;
}

/** Manual DOCX text: DOCX is a zip; inflate word/document.xml and strip to <w:t> text. */
function docxManual(buf: Buffer): string | null {
  try {
    const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (eocd < 0) return null;
    const count = buf.readUInt16LE(eocd + 10);
    let central = buf.readUInt32LE(eocd + 16);
    for (let i = 0; i < count; i++) {
      if (buf.readUInt32LE(central) !== 0x02014b50) return null;
      const method = buf.readUInt16LE(central + 10);
      const nameLen = buf.readUInt16LE(central + 28);
      const extraLen = buf.readUInt16LE(central + 30);
      const commentLen = buf.readUInt16LE(central + 32);
      const localOff = buf.readUInt32LE(central + 42);
      const name = buf.subarray(central + 46, central + 46 + nameLen).toString("utf8");
      central += 46 + nameLen + extraLen + commentLen;
      if (name !== "word/document.xml") continue;
      const compSize = buf.readUInt32LE(central - commentLen - extraLen - nameLen - 4 + 18); // placeholder guard
      void compSize;
      const lh = localOff;
      if (buf.readUInt32LE(lh) !== 0x04034b50) return null;
      const lhNameLen = buf.readUInt16LE(lh + 26);
      const lhExtraLen = buf.readUInt16LE(lh + 28);
      const dataOff = lh + 30 + lhNameLen + lhExtraLen;
      // compressed size from central directory record we just parsed:
      const cSize = buf.readUInt32LE(central - commentLen - extraLen - nameLen - 46 + 20);
      const raw = buf.subarray(dataOff, dataOff + cSize);
      const xml = (method === 8 ? inflateRawSync(raw) : raw).toString("utf8");
      const texts = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]);
      return texts.join(" ").replace(/\s+/g, " ").trim() || null;
    }
  } catch (e) {
    logger.warn("[files] docx manual failed", { err: String(e) });
  }
  return null;
}

/** Best-effort PDF text: decode Flate streams, extract Tj/TJ strings. */
function pdfManual(buf: Buffer): string | null {
  try {
    const bin = buf.toString("binary");
    const out: string[] = [];
    const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m: RegExpExecArray | null;
    let scanned = 0;
    while ((m = re.exec(bin)) && scanned < 200) {
      scanned++;
      const raw = Buffer.from(m[1], "binary");
      let text = "";
      try {
        text = inflateSync(raw).toString("binary");
      } catch {
        try {
          text = inflateRawSync(raw).toString("binary");
        } catch {
          text = m[1];
        }
      }
      const ops: string[] = [];
      const tj = /\((?:\\.|[^\\()])*\)\s*Tj/g;
      let t: RegExpExecArray | null;
      while ((t = tj.exec(text))) {
        ops.push(t[0].slice(1, t[0].lastIndexOf(")")).replace(/\\([nrtbf()\\])/g, "$1"));
      }
      const arr = /\[([^\]]*)\]\s*TJ/g;
      while ((t = arr.exec(text))) {
        const parts = [...t[1].matchAll(/\((?:\\.|[^\\()])*\)/g)].map((x) => x[0].slice(1, -1).replace(/\\([nrtbf()\\])/g, "$1"));
        ops.push(parts.join(""));
      }
      if (ops.length) out.push(ops.join(" "));
    }
    const joined = out.join("\n").replace(/\s+/g, " ").trim();
    return joined.length > 40 ? joined.slice(0, MAX_TEXT) : null;
  } catch (e) {
    logger.warn("[files] pdf manual failed", { err: String(e) });
  }
  return null;
}

async function extractDocx(buf: Buffer): Promise<string | null> {
  const { optionalImport } = await import("../../core/http");
  const mammoth = (await optionalImport("mammoth")) as {
    extractRawText: (arg: { buffer: Buffer }) => Promise<{ value: string }>;
  } | null;
  if (mammoth) {
    try {
      const out = await mammoth.extractRawText({ buffer: buf });
      if (out.value?.trim()) return out.value.slice(0, MAX_TEXT);
    } catch {
      // fall through to manual (D-11)
    }
  }
  return docxManual(buf);
}

async function extractPdf(buf: Buffer): Promise<string | null> {
  const { optionalImport } = await import("../../core/http");
  const unpdf = (await optionalImport("unpdf")) as {
    extractText: (buf: Uint8Array, opts?: unknown) => Promise<{ text: string | string[] }>;
  } | null;
  if (unpdf) {
    try {
      const out = await unpdf.extractText(new Uint8Array(buf));
      const text = Array.isArray(out.text) ? out.text.join("\n") : out.text;
      if (text?.trim()) return text.slice(0, MAX_TEXT);
    } catch {
      // fall through to manual (D-11)
    }
  }
  return pdfManual(buf);
}

export async function processFile(job: Job<{ fileId: string }>) {
  const { fileId } = job.data;
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.extractionStatus !== "PENDING") return;
  const bytes = await readBytes(file.storageKey, file.url);
  if (!bytes) {
    await prisma.file.update({ where: { id: fileId }, data: { extractionStatus: "FAILED" } });
    return;
  }
  let status: "EXTRACTED" | "UNSUPPORTED" | "FAILED" = "FAILED";
  let text: string | null = null;
  if (file.mimeType === "text/plain") {
    text = bytes.toString("utf8").slice(0, MAX_TEXT);
    status = "EXTRACTED";
  } else if (file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    text = await extractDocx(bytes);
    status = text ? "EXTRACTED" : "FAILED";
  } else if (file.mimeType === "application/pdf") {
    text = await extractPdf(bytes);
    status = text ? "EXTRACTED" : "FAILED";
  } else {
    status = "UNSUPPORTED"; // DOC and images: stored, passed to Gemini as inline parts
  }
  await prisma.file.update({ where: { id: fileId }, data: { extractionStatus: status, extractedText: text } });

  // Roll the parent submission forward once all its files are terminal.
  const siblings = await prisma.file.findMany({ where: { submissionId: file.submissionId ?? undefined, id: { not: fileId } }, select: { extractionStatus: true } });
  void siblings;
  if (file.submissionId) {
    const pending = await prisma.file.count({ where: { submissionId: file.submissionId, extractionStatus: "PENDING" } });
    if (pending === 0) {
      await prisma.submission.updateMany({ where: { id: file.submissionId, status: "PROCESSING" }, data: { status: "EXTRACTED" } });
    }
  }
}
