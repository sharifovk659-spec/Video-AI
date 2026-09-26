import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url().default("https://video.inovaauto.com"),
  APP_NAME: z.string().min(1).default("Vidoo AI"),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (url) => url.startsWith("mysql://"),
      "DATABASE_URL must use mysql:// protocol",
    ),
  SESSION_SECRET: z.string().min(32).optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_MINI_APP_URL: z
    .string()
    .url()
    .default("https://video.inovaauto.com/mini-app"),
  ADMIN_TELEGRAM_IDS: z.string().default(""),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  STORAGE_PROVIDER: z.string().default("local"),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5_242_880),
  TEMPLATE_COVER_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5_242_880),
  TEMPLATE_PREVIEW_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(52_428_800),
  GENERATED_VIDEO_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(104_857_600),
  UPLOAD_TEMP_TTL_HOURS: z.coerce.number().int().positive().default(24),
  TELEGRAM_NOTIFY_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  AI_DEFAULT_PROVIDER: z.string().optional(),
  AI_ALLOW_MOCK_PROVIDER: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  KLING_API_KEY: z.string().optional(),
  KLING_API_BASE_URL: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .pipe(z.string().url().optional()),
  VEO_API_KEY: z.string().optional(),
  VEO_API_BASE_URL: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .pipe(z.string().url().optional()),
  GENERATION_JOB_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  GENERATION_JOB_TIMEOUT_MS: z.coerce.number().int().positive().default(900_000),
  GENERATION_JOB_LOCK_MS: z.coerce.number().int().positive().default(30_000),
  GENERATION_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5_000),
  PAYMENTS_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  PAYMENT_PROVIDER: z.string().default("stub"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** @internal Test helper */
export function resetEnvCache(): void {
  cached = null;
}

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  cached = parsed.data;
  return cached;
}

export function getAdminTelegramIds(): bigint[] {
  const raw = getEnv().ADMIN_TELEGRAM_IDS.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => BigInt(s));
}
