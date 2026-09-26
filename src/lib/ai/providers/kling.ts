import type {
  AIProvider,
  CostEstimateInput,
  CreateGenerationInput,
  CreateGenerationResult,
  GenerationStatusResult,
  NormalizedProviderError,
} from "@/lib/ai/types";
import { getEnv } from "@/lib/config/env";
import { AppError } from "@/lib/errors/app-error";

/**
 * Kling adapter — credentials from env only.
 * Does not invent successful results when API is unavailable.
 */
export class KlingProvider implements AIProvider {
  readonly slug = "kling";

  private requireCredentials(): { apiKey: string; baseUrl: string } {
    const env = getEnv();
    const apiKey = env.KLING_API_KEY;
    const baseUrl = env.KLING_API_BASE_URL;
    if (!apiKey || !baseUrl) {
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Kling provider is not configured",
        { expose: false },
      );
    }
    return { apiKey, baseUrl: baseUrl.replace(/\/$/, "") };
  }

  async createGeneration(input: CreateGenerationInput): Promise<CreateGenerationResult> {
    const { apiKey, baseUrl } = this.requireCredentials();
    try {
      const response = await fetch(`${baseUrl}/v1/videos/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: input.modelSlug,
          prompt: input.prompt,
          negative_prompt: input.negativePrompt,
          image_url: input.imageUrl,
          duration: input.durationSeconds,
          aspect_ratio: input.aspectRatio,
          external_id: input.generationId,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Kling create failed (${response.status}): ${text.slice(0, 300)}`);
      }

      const data = (await response.json()) as { id?: string; request_id?: string };
      const providerRequestId = data.id ?? data.request_id;
      if (!providerRequestId) {
        throw new Error("Kling response missing request id");
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
      `${baseUrl}/v1/videos/generations/${encodeURIComponent(providerRequestId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!response.ok) {
      throw new Error(`Kling status failed (${response.status})`);
    }
    const data = (await response.json()) as {
      status?: string;
      output_url?: string;
      error?: string;
      stage?: string;
    };
    return {
      status: mapProviderStatus(data.status),
      outputUrl: data.output_url ?? null,
      errorMessage: data.error ?? null,
      stage: data.stage ?? null,
    };
  }

  async cancelGeneration(providerRequestId: string): Promise<void> {
    const { apiKey, baseUrl } = this.requireCredentials();
    await fetch(
      `${baseUrl}/v1/videos/generations/${encodeURIComponent(providerRequestId)}/cancel`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
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
    default:
      return "failed";
  }
}
