import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),

    // Infrastructure
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DIRECT_URL: z.string().min(1).optional(),
    REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
    FRONTEND_URL: z.string().min(1).default("http://localhost:3000"),
    BACKEND_PUBLIC_URL: z.string().min(1).optional(),

    // Auth — required, no fallbacks (§2.2 D16)
    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    JWT_ACCESS_TTL: z.string().min(1).default("15m"),
    JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),

    // AI
    AI_PROVIDER: z.enum(["gemini", "mock"]).default("mock"),
    GEMINI_API_KEY: z.string().default(""),
    GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),

    // Storage
    STORAGE_DRIVER: z.enum(["cloudinary", "local"]).default("local"),
    CLOUDINARY_CLOUD_NAME: z.string().default(""),
    CLOUDINARY_API_KEY: z.string().default(""),
    CLOUDINARY_API_SECRET: z.string().default(""),

    // Email
    MAIL_ENABLED: z
      .union([z.boolean(), z.string()])
      .transform((v) => (typeof v === "boolean" ? v : ["true", "1", "yes"].includes(v.toLowerCase())))
      .default(true),
    SMTP_HOST: z.string().min(1).default("localhost"),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_USER: z.string().default(""),
    SMTP_PASS: z.string().default(""),
    SMTP_FROM: z.string().min(1).default("ScopeBridge <no-reply@scopebridge.app>"),

    // Rate limits
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_API_MAX: z.coerce.number().int().positive().default(1000),
    RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_AI_MAX: z.coerce.number().int().positive().default(60),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV === "production" && v.STORAGE_DRIVER === "local") {
      ctx.addIssue({ code: "custom", message: "STORAGE_DRIVER=local is refused in production", path: ["STORAGE_DRIVER"] });
    }
    if (v.NODE_ENV === "production" && v.AI_PROVIDER === "mock") {
      ctx.addIssue({ code: "custom", message: "AI_PROVIDER=mock is refused in production", path: ["AI_PROVIDER"] });
    }
    if (v.AI_PROVIDER === "gemini" && !v.GEMINI_API_KEY) {
      ctx.addIssue({ code: "custom", message: "GEMINI_API_KEY is required when AI_PROVIDER=gemini", path: ["GEMINI_API_KEY"] });
    }
    if (v.STORAGE_DRIVER === "cloudinary") {
      for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const) {
        if (!v[key]) ctx.addIssue({ code: "custom", message: `${key} is required when STORAGE_DRIVER=cloudinary`, path: [key] });
      }
    }
  });

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "[env] invalid environment:\n" +
        parsed.error.errors.map((e) => `  - ${e.path.join(".")}: ${e.message}`).join("\n")
    );
    process.exit(1);
  }
  const v = parsed.data;
  return {
    ...v,
    DIRECT_URL: v.DIRECT_URL ?? v.DATABASE_URL,
    frontendOrigins: v.FRONTEND_URL.split(",").map((s) => s.trim()).filter(Boolean),
    isProd: v.NODE_ENV === "production",
    isTest: v.NODE_ENV === "test",
  };
}

export const env = loadEnv();
export type Env = typeof env;
