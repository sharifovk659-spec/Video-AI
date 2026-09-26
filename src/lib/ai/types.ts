export type AIProviderSlug = string;

export type ProviderGenerationStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type CreateGenerationInput = {
  generationId: string;
  modelSlug: string;
  prompt: string;
  negativePrompt?: string | null;
  imageUrl?: string | null;
  durationSeconds?: number | null;
  aspectRatio?: string | null;
};

export type CreateGenerationResult = {
  providerRequestId: string;
};

export type GenerationStatusResult = {
  status: ProviderGenerationStatus;
  outputUrl?: string | null;
  errorMessage?: string | null;
  stage?: string | null;
};

export type NormalizedProviderError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type CostEstimateInput = {
  modelSlug: string;
  durationSeconds?: number | null;
};

/**
 * Provider-independent AI video adapter.
 * Business logic must only depend on this interface.
 */
export interface AIProvider {
  readonly slug: AIProviderSlug;
  createGeneration(input: CreateGenerationInput): Promise<CreateGenerationResult>;
  getGenerationStatus(providerRequestId: string): Promise<GenerationStatusResult>;
  cancelGeneration(providerRequestId: string): Promise<void>;
  normalizeError(error: unknown): NormalizedProviderError;
  estimateCost(input: CostEstimateInput): number;
}
