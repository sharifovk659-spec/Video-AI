import type {
  AIProvider,
  CostEstimateInput,
  CreateGenerationInput,
  CreateGenerationResult,
  GenerationStatusResult,
  NormalizedProviderError,
} from "@/lib/ai/types";
import type { Env } from "@/lib/config/env";
import { getEnv } from "@/lib/config/env";
import { AppError } from "@/lib/errors/app-error";
import { createLogger } from "@/lib/logger";
import {
  formatPiApiFailure,
  isPiApiTaskFailed,
  redactProviderSecrets,
} from "@/lib/ai/providers/piapi-errors";
import {
  EphemeralUploadNotAllowedError,
  mimeToUploadFileName,
  probeProviderImageUrl,
  uploadPiApiEphemeralImage,
} from "@/lib/ai/providers/piapi-ephemeral";

const log = createLogger("kling-provider");

const PIAPI_DEFAULT_BASE = "https://api.piapi.ai";

type KlingModelConfig = { version: string; mode: "std" | "pro" };

/**
 * Kling via PiAPI (https://piapi.ai) — credentials from env only.
 */
export class KlingProvider implements AIProvider {
  readonly slug = "kling";

  private requireCredentials(): { apiKey: string; baseUrl: string } {
    const env = getEnv();
    const apiKey = env.KLING_API_KEY;
    if (!apiKey) {
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Kling provider is not configured",
        { expose: false },
      );
    }
    const baseUrl = (env.KLING_API_BASE_URL ?? PIAPI_DEFAULT_BASE).replace(
      /\/$/,
      "",
    );
    return { apiKey, baseUrl };
  }

  async createGeneration(input: CreateGenerationInput): Promise<CreateGenerationResult> {
    const { apiKey, baseUrl } = this.requireCredentials();
    const env = getEnv();
    const { version, mode } = parseKlingModelConfig(input.modelSlug, env);
    const duration = normalizeDuration(input.durationSeconds);
    const prompt = (input.prompt ?? "").trim();
    if (!prompt) {
      throw new Error("Kling requires a non-empty prompt");
    }

    const imageUrl = await this.resolveImageUrl(apiKey, input);
    const body = buildKlingTaskBody({
      prompt,
      negativePrompt: input.negativePrompt,
      imageUrl,
      version,
      mode,
      duration,
    });

    const imageHost = safeImageHost(imageUrl);
    log.info("Submitting Kling task", {
      generationId: input.generationId,
      version,
      mode,
      duration,
      promptChars: prompt.length,
      hasImageUrl: true,
      imageHost,
      endpoint: "/api/v1/task",
    });

    try {
      const response = await fetch(`${baseUrl}/api/v1/task`, {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const raw = await response.text();
      let json: PiApiEnvelope<PiApiTask>;
      try {
        json = JSON.parse(raw) as PiApiEnvelope<PiApiTask>;
      } catch {
        throw new Error(
          `Kling create failed (${response.status}): ${redactProviderSecrets(raw).slice(0, 200)}`,
        );
      }

      if (!response.ok || (json.code != null && json.code !== 200)) {
        throw new Error(formatPiApiFailure("create", json, response.status));
      }

      const task = json.data ?? ({} as PiApiTask);
      const providerRequestId = task.task_id;
      if (!providerRequestId) {
        throw new Error(formatPiApiFailure("create", json, response.status));
      }

      if (isPiApiTaskFailed(task.status)) {
        throw new Error(formatPiApiFailure("create", json, response.status));
      }

      return { providerRequestId };
    } catch (error) {
      const message =
        error instanceof Error
          ? redactProviderSecrets(error.message)
          : redactProviderSecrets(String(error));
      throw Object.assign(new Error(message), {
        provider: this.slug,
      });
    }
  }

  private async resolveImageUrl(
    apiKey: string,
    input: CreateGenerationInput,
  ): Promise<string> {
    const fallbackUrl = input.imageUrl?.trim() || null;

    if (input.imageBytes && input.imageBytes.length > 0) {
      const fileName =
        input.imageFileName?.trim() || mimeToUploadFileName("image/jpeg");
      try {
        return await uploadPiApiEphemeralImage({
          apiKey,
          bytes: input.imageBytes,
          fileName,
        });
      } catch (error) {
        if (
          error instanceof EphemeralUploadNotAllowedError &&
          fallbackUrl
        ) {
          log.warn("PiAPI ephemeral upload unavailable; using HTTPS image URL", {
            generationId: input.generationId,
          });
          return this.requireReachableImageUrl(fallbackUrl);
        }
        throw error;
      }
    }

    if (!fallbackUrl) {
      throw new Error("Kling image-to-video requires image_url or imageBytes");
    }

    return this.requireReachableImageUrl(fallbackUrl);
  }

  private async requireReachableImageUrl(url: string): Promise<string> {
    const probe = await probeProviderImageUrl(url);
    if (!probe.ok) {
      throw new Error(
        `Source image not reachable for PiAPI (status=${probe.status ?? "network"}). Ensure the photo URL is public HTTPS without bot protection.`,
      );
    }
    return url;
  }

  async getGenerationStatus(providerRequestId: string): Promise<GenerationStatusResult> {
    const { apiKey, baseUrl } = this.requireCredentials();
    const response = await fetch(
      `${baseUrl}/api/v1/task/${encodeURIComponent(providerRequestId)}`,
      { headers: { "X-API-Key": apiKey } },
    );
    const raw = await response.text();
    let json: PiApiEnvelope<PiApiTask>;
    try {
      json = JSON.parse(raw) as PiApiEnvelope<PiApiTask>;
    } catch {
      throw new Error(`Kling status failed (${response.status})`);
    }

    if (!response.ok || (json.code != null && json.code !== 200)) {
      throw new Error(formatPiApiFailure("status", json, response.status));
    }

    const task = json.data ?? ({} as PiApiTask);
    const outputUrl =
      task.output?.video_url ??
      task.output?.videoUrl ??
      task.output_url ??
      null;
    const errorField = task.error;
    const errorMessage =
      errorField && typeof errorField === "object"
        ? errorField.raw_message ?? errorField.message ?? null
        : typeof errorField === "string"
          ? errorField
          : null;

    const failed = isPiApiTaskFailed(task.status);
    if (failed && !errorMessage) {
      log.warn("Kling task failed", {
        taskId: providerRequestId,
        detail: redactProviderSecrets(formatPiApiFailure("status", json)),
      });
    }

    return {
      status: mapProviderStatus(task.status),
      outputUrl,
      errorMessage: errorMessage
        ? redactProviderSecrets(errorMessage).slice(0, 500)
        : failed
          ? formatPiApiFailure("status", json)
          : null,
      stage: task.status ?? null,
    };
  }

  async cancelGeneration(providerRequestId: string): Promise<void> {
    const { apiKey, baseUrl } = this.requireCredentials();
    await fetch(
      `${baseUrl}/api/v1/task/${encodeURIComponent(providerRequestId)}/cancel`,
      {
        method: "POST",
        headers: { "X-API-Key": apiKey },
      },
    );
  }

  normalizeError(error: unknown): NormalizedProviderError {
    const message = redactProviderSecrets(
      error instanceof Error ? error.message : String(error),
    );
    return {
      code: "KLING_ERROR",
      message,
      retryable: /429|timeout|5\d\d|temporarily/i.test(message),
    };
  }

  estimateCost(input: CostEstimateInput): number {
    const seconds = input.durationSeconds ?? 5;
    return Math.max(1, Math.ceil(seconds) * 8);
  }
}

type PiApiEnvelope<T> = { code?: number; message?: string; data?: T };
type PiApiTask = {
  task_id?: string;
  status?: string;
  output?: { video_url?: string; videoUrl?: string };
  output_url?: string;
  error?: { message?: string; raw_message?: string } | string;
  error_message?: string;
};

export function parseKlingModelConfig(
  modelSlug: string,
  env: Env,
): KlingModelConfig {
  const match = modelSlug.match(/^video-kling-([\d.]+)-(std|pro)$/);
  if (match) {
    return { version: match[1], mode: match[2] as "std" | "pro" };
  }
  const version = env.KLING_VERSION?.trim() || "2.5";
  const modeRaw = env.KLING_MODE?.trim() || "std";
  const mode = modeRaw === "pro" ? "pro" : "std";
  return { version, mode };
}

export function normalizeDuration(durationSeconds?: number | null): 5 | 10 {
  if (!durationSeconds || durationSeconds <= 5) return 5;
  return 10;
}

export type KlingTaskBody = {
  model: "kling";
  task_type: "video_generation";
  input: {
    prompt: string;
    negative_prompt?: string;
    image_url: string;
    version: string;
    mode: "std" | "pro";
    duration: 5 | 10;
  };
  config: { service_mode: "public" };
};

/** Image-to-video body per PiAPI Kling create-task (no aspect_ratio; image sets frame). */
export function buildKlingTaskBody(args: {
  prompt: string;
  negativePrompt?: string | null;
  imageUrl: string;
  version: string;
  mode: "std" | "pro";
  duration: 5 | 10;
}): KlingTaskBody {
  const prompt = args.prompt.trim();
  const imageUrl = args.imageUrl.trim();
  if (!prompt) throw new Error("Kling requires a non-empty prompt");
  if (!imageUrl.startsWith("https://")) {
    throw new Error("Kling image_url must be a public HTTPS URL");
  }
  if (!args.version.trim()) throw new Error("Kling version is required");

  const negative = args.negativePrompt?.trim();
  return {
    model: "kling",
    task_type: "video_generation",
    input: {
      prompt,
      ...(negative ? { negative_prompt: negative } : {}),
      image_url: imageUrl,
      version: args.version,
      mode: args.mode,
      duration: args.duration,
    },
    config: { service_mode: "public" },
  };
}

function safeImageHost(imageUrl: string): string {
  try {
    return new URL(imageUrl).host;
  } catch {
    return "invalid";
  }
}

function mapProviderStatus(status?: string): GenerationStatusResult["status"] {
  switch ((status ?? "").toLowerCase()) {
    case "queued":
    case "pending":
      return "queued";
    case "running":
    case "processing":
      return "processing";
    case "succeeded":
    case "completed":
    case "success":
      return "completed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "failed":
      return "failed";
    default:
      return status ? "processing" : "failed";
  }
}
