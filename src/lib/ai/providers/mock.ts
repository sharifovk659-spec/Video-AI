import { randomUUID } from "node:crypto";
import type {
  AIProvider,
  CostEstimateInput,
  CreateGenerationInput,
  CreateGenerationResult,
  GenerationStatusResult,
  NormalizedProviderError,
} from "@/lib/ai/types";

type MockJob = {
  createdAt: number;
  completeAt: number;
  fail?: boolean;
};

/**
 * Mock provider for automated/local tests only.
 * Never registered in production unless AI_ALLOW_MOCK_PROVIDER=true.
 */
export class MockProvider implements AIProvider {
  readonly slug = "mock";
  private jobs = new Map<string, MockJob>();

  async createGeneration(input: CreateGenerationInput): Promise<CreateGenerationResult> {
    void input;
    const providerRequestId = `mock_${randomUUID()}`;
    this.jobs.set(providerRequestId, {
      createdAt: Date.now(),
      completeAt:
        Date.now() +
        Number(process.env.MOCK_AI_COMPLETE_MS ?? 1500),
      fail: process.env.MOCK_AI_FORCE_FAIL === "true",
    });
    return { providerRequestId };
  }

  async getGenerationStatus(providerRequestId: string): Promise<GenerationStatusResult> {
    const job = this.jobs.get(providerRequestId);
    if (!job) {
      return { status: "failed", errorMessage: "Unknown mock job" };
    }
    if (Date.now() < job.completeAt) {
      return { status: "processing", stage: "rendering" };
    }
    if (job.fail) {
      return { status: "failed", errorMessage: "Mock forced failure" };
    }
    return {
      status: "completed",
      stage: "completed",
      outputUrl: "https://video.inovaauto.com/demo/sample-output.mp4",
    };
  }

  async cancelGeneration(providerRequestId: string): Promise<void> {
    this.jobs.delete(providerRequestId);
  }

  normalizeError(error: unknown): NormalizedProviderError {
    return {
      code: "MOCK_ERROR",
      message: error instanceof Error ? error.message : String(error),
      retryable: false,
    };
  }

  estimateCost(input: CostEstimateInput): number {
    void input;
    return 1;
  }
}
