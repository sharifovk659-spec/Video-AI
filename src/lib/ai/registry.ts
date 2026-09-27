import type { AIProvider } from "@/lib/ai/types";
import { resolveAIProviderSlug } from "@/lib/ai/resolve-provider";
import { getEnv } from "@/lib/config/env";
import { AppError } from "@/lib/errors/app-error";
import { KlingProvider } from "@/lib/ai/providers/kling";
import { VeoProvider } from "@/lib/ai/providers/veo";
import { MockProvider } from "@/lib/ai/providers/mock";

const registry = new Map<string, AIProvider>();
let bootstrapped = false;

export function registerAIProvider(provider: AIProvider): void {
  registry.set(provider.slug, provider);
}

export function bootstrapAIProviders(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  registerAIProvider(new KlingProvider());
  registerAIProvider(new VeoProvider());

  const env = getEnv();
  if (env.NODE_ENV !== "production" || env.AI_ALLOW_MOCK_PROVIDER) {
    registerAIProvider(new MockProvider());
  }
}

export function getAIProvider(slug: string): AIProvider {
  bootstrapAIProviders();
  const resolved = resolveAIProviderSlug(slug);
  const provider = registry.get(resolved);
  if (!provider) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      `AI provider "${resolved}" is not configured`,
    );
  }
  return provider;
}

export function listRegisteredAIProviders(): string[] {
  bootstrapAIProviders();
  return [...registry.keys()];
}
