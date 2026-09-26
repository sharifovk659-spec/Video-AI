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
 * Veo adapter — credentials from env only.
 * Does not invent successful results when API is unavailable.
 */
export class VeoProvider implements AIProvider {
  readonly slug = "veo";

  private requireCredentials(): { apiKey: string; baseUrl: string } {
    const env = getEnv();
    const apiKey = env.VEO_API_KEY;
    const baseUrl = env.VEO_API_BASE_URL;
    if (!apiKey || !baseUrl) {
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Veo provider is not configured",
        { expose: false },
      );
    }
    return { apiKey, baseUrl: baseUrl.replace(/\/$/, "") };
  }

  async createGeneration(input: CreateGenerationInput): Promise<CreateGenerationResult> {
    const { apiKey, baseUrl } = this.requireCredentials();
    const response = await fetch(`${baseUrl}/v1/operations`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.modelSlug,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        imageUri: input.imageUrl,
        durationSeconds: input.durationSeconds,
        aspectRatio: input.aspectRatio,
        clientRequestId: input.generationId,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Veo create failed (${response.status}): ${text.slice(0, 300)}`);
    }

    const data = (await response.json()) as { name?: string; operationId?: string };
    const providerRequestId = data.operationId ?? data.name;
    if (!providerRequestId) {
      throw new Error("Veo response missing operation id");
    }
    return { providerRequestId };
  }

  async getGenerationStatus(providerRequestId: string): Promise<GenerationStatusResult> {
    const { apiKey, baseUrl } = this.requireCredentials();
    const response = await fetch(
      `${baseUrl}/v1/operations/${encodeURIComponent(providerRequestId)}`,
      { headers: { "x-api-key": apiKey } },
    );
    if (!response.ok) {
      throw new Error(`Veo status failed (${response.status})`);
    }
    const data = (await response.json()) as {
      done?: boolean;
      error?: { message?: string };
      response?: { videoUri?: string };
      metadata?: { stage?: string };
    };

    if (data.error?.message) {
      return { status: "failed", errorMessage: data.error.message };
    }
    if (data.done && data.response?.videoUri) {
      return {
        status: "completed",
        outputUrl: data.response.videoUri,
        stage: "completed",
      };
    }
    return {
      status: "processing",
      stage: data.metadata?.stage ?? "processing",
    };
  }

  async cancelGeneration(providerRequestId: string): Promise<void> {
    const { apiKey, baseUrl } = this.requireCredentials();
    await fetch(
      `${baseUrl}/v1/operations/${encodeURIComponent(providerRequestId)}:cancel`,
      {
        method: "POST",
        headers: { "x-api-key": apiKey },
      },
    );
  }

  normalizeError(error: unknown): NormalizedProviderError {
    const message = error instanceof Error ? error.message : String(error);
    return {
      code: "VEO_ERROR",
      message,
      retryable: /429|timeout|5\d\d|unavailable/i.test(message),
    };
  }

  estimateCost(input: CostEstimateInput): number {
    const seconds = input.durationSeconds ?? 5;
    return Math.max(1, Math.ceil(seconds) * 12);
  }
}
