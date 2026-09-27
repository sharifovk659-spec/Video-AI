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
    const aspectRatio = input.aspectRatio ?? "9:16";

    if (!input.imageUrl) {
      throw new Error("Kling image-to-video requires image_url");
    }

    try {
      const response = await fetch(`${baseUrl}/api/v1/task`, {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "kling",
          task_type: "video_generation",
          input: {
            prompt: input.prompt,
            negative_prompt: input.negativePrompt ?? undefined,
            image_url: input.imageUrl,
            version,
            mode,
            duration,
            aspect_ratio: aspectRatio,
            enable_audio: false,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Kling create failed (${response.status}): ${text.slice(0, 300)}`);
      }

      const data = (await response.json()) as PiApiEnvelope<PiApiTask>;
      const task = data.data ?? (data as unknown as PiApiTask);
      const providerRequestId = task.task_id;
      if (!providerRequestId) {
        throw new Error("Kling response missing task_id");
      }
      return { providerRequestId };
    } catch (error) {
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
        provider: this.slug,
      });
    }
  }

  async getGenerationStatus(providerRequestId: string): Promise<GenerationStatusResult> {
    const { apiKey, baseUrl } = this.requireCredentials();
    const response = await fetch(
      `${baseUrl}/api/v1/task/${encodeURIComponent(providerRequestId)}`,
      { headers: { "X-API-Key": apiKey } },
    );
    if (!response.ok) {
      throw new Error(`Kling status failed (${response.status})`);
    }
    const data = (await response.json()) as PiApiEnvelope<PiApiTask>;
    const task = data.data ?? (data as unknown as PiApiTask);
    const outputUrl =
      task.output?.video_url ??
      task.output?.videoUrl ??
      task.output_url ??
      null;
    const errorField = task.error;
    const errorMessage =
      task.error_message ??
      (typeof errorField === "string"
        ? errorField
        : errorField?.message ?? null);

    return {
      status: mapProviderStatus(task.status),
      outputUrl,
      errorMessage,
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
    const message = error instanceof Error ? error.message : String(error);
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

type PiApiEnvelope<T> = { code?: number; data?: T };
type PiApiTask = {
  task_id?: string;
  status?: string;
  output?: { video_url?: string; videoUrl?: string };
  output_url?: string;
  error?: { message?: string } | string;
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
