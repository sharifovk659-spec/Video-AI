import { getEnv } from "@/lib/config/env";

const MOCK_PROVIDER = "mock";
const DEFAULT_PRODUCTION_PROVIDER = "kling";
const MOCK_MODEL_PREFIX = "video-mock";
const DEFAULT_KLING_MODEL = "video-kling-2.5-std";

/**
 * Maps legacy mock catalog entries to a real provider in production.
 * Keeps mock when explicitly allowed (local/tests).
 */
export function resolveAIProviderSlug(slug: string): string {
  const env = getEnv();
  if (slug !== MOCK_PROVIDER) return slug;

  const mockAllowed =
    env.NODE_ENV !== "production" || env.AI_ALLOW_MOCK_PROVIDER;
  if (mockAllowed) return MOCK_PROVIDER;

  const configured = env.AI_DEFAULT_PROVIDER?.trim();
  if (configured && configured !== MOCK_PROVIDER) return configured;
  return DEFAULT_PRODUCTION_PROVIDER;
}

/**
 * When redirecting off mock, use the configured Kling model slug for the worker.
 */
export function resolveAIModelSlug(
  providerSlug: string,
  modelSlug: string,
): string {
  const resolvedProvider = resolveAIProviderSlug(providerSlug);
  if (
    providerSlug === MOCK_PROVIDER &&
    resolvedProvider !== MOCK_PROVIDER &&
    modelSlug.startsWith(MOCK_MODEL_PREFIX)
  ) {
    const env = getEnv();
    const configured = env.KLING_DEFAULT_MODEL_SLUG?.trim();
    return configured && configured.length > 0 ? configured : DEFAULT_KLING_MODEL;
  }
  return modelSlug;
}

export function isMockProviderAvailable(): boolean {
  const env = getEnv();
  return env.NODE_ENV !== "production" || env.AI_ALLOW_MOCK_PROVIDER;
}
