import multer from "multer";
import { AppError } from "../core/http";

export const MAX_FILES = 10;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
]);

function startsWith(buf: Buffer, text: string): boolean {
  return buf.length >= text.length && buf.subarray(0, text.length).toString("binary") === text;
}

function hex(buf: Buffer, n: number): string {
  return buf.subarray(0, n).toString("hex").toUpperCase();
}

/** Real magic-byte checks for every allowed type — no permissive fallback (§2.2 D24). */
export function magicOk(buf: Buffer, mime: string): boolean {
  if (buf.length < 8) return false;
  switch (mime) {
    case "application/pdf":
      return startsWith(buf, "%PDF-");
    case "application/msword":
      return hex(buf, 8) === "D0CF11E0A1B11AE1"; // OLE2 compound document
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return hex(buf, 4) === "504B0304"; // ZIP
    case "image/png":
      return hex(buf, 8) === "89504E470D0A1A0A";
    case "image/jpeg":
      return hex(buf, 3) === "FFD8FF";
    case "image/webp":
      return hex(buf, 4) === "52494646" && buf.length >= 12 && buf.subarray(8, 12).toString("binary") === "WEBP";
    case "text/plain": {
      // Reject binary masquerading as text: must decode as UTF-8 without NUL bytes.
      if (buf.includes(0)) return false;
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(buf.subarray(0, Math.min(buf.length, 8192)));
        return true;
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

export function assertMagic(buffer: Buffer, mime: string, originalName: string) {
  if (!ALLOWED_MIME.has(mime) || !magicOk(buffer, mime)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `File "${originalName}" failed type validation (allowed: PDF, DOC, DOCX, PNG, JPG, WEBP, TXT, max 10MB each)`,
      [{ path: "file", message: "File content does not match its type" }],
    );
  }
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new AppError("VALIDATION_ERROR", `Unsupported file type: ${file.mimetype}`) as unknown as null, false);
      return;
    }
    cb(null, true);
  },
});

export const uploadMany = upload.array("files", MAX_FILES);
export const uploadSingle = upload.single("file");
