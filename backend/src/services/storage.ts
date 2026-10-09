import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";
import { logger } from "../core/logger";

export interface UploadMeta {
  originalName: string;
  mimeType: string;
  size: number;
  projectId: string;
  folder?: string;
}

export interface StoredFile {
  key: string;
  url: string | null;
}

const UPLOAD_DIR = path.join(__dirname, "..", "..", ".uploads");

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

async function uploadLocal(buffer: Buffer, meta: UploadMeta): Promise<StoredFile> {
  ensureUploadDir();
  const key = `${meta.projectId}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${meta.originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const full = path.join(UPLOAD_DIR, key);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  await fs.promises.writeFile(full, buffer);
  return { key, url: null };
}

async function uploadCloudinary(buffer: Buffer, meta: UploadMeta): Promise<StoredFile> {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  const publicId = `${meta.folder ?? "scopebridge"}/${meta.projectId}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  const result: { secure_url: string; public_id: string } = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: "auto", type: "authenticated" },
      (err, res) => (err || !res ? reject(err ?? new Error("Cloudinary upload failed")) : resolve({ secure_url: res.secure_url, public_id: res.public_id })),
    );
    stream.end(buffer);
  });
  return { key: result.public_id, url: result.secure_url };
}

export async function uploadFile(buffer: Buffer, meta: UploadMeta): Promise<StoredFile> {
  if (env.STORAGE_DRIVER === "cloudinary") return uploadCloudinary(buffer, meta);
  return uploadLocal(buffer, meta);
}

export async function deleteFile(key: string): Promise<void> {
  try {
    if (env.STORAGE_DRIVER === "cloudinary") {
      await cloudinary.uploader.destroy(key);
      return;
    }
    await fs.promises.unlink(path.join(UPLOAD_DIR, key));
  } catch (err) {
    logger.warn("storage delete failed", { key, err: String(err) });
  }
}

export function localFilePath(key: string): string {
  return path.join(UPLOAD_DIR, key);
}

/** Short-lived download URL. Local: null (served by the download endpoint). Cloudinary: signed URL. */
export async function getDownloadUrl(key: string, originalName: string): Promise<string | null> {
  if (env.STORAGE_DRIVER !== "cloudinary") return null;
  return cloudinary.utils.private_download_url(key, "", {
    resource_type: "auto",
    type: "authenticated",
    attachment: originalName,
    expires_at: Math.floor(Date.now() / 1000) + 15 * 60,
  } as never) as unknown as string;
}
