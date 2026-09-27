import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { resetEnvCache } from "@/lib/config/env";
import {
  resolveAIProviderSlug,
  resolveAIModelSlug,
} from "@/lib/ai/resolve-provider";

function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => void,
): void {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    prev[key] = process.env[key];
    const value = vars[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  resetEnvCache();
  try {
    fn();
  } finally {
    for (const key of Object.keys(vars)) {
      const value = prev[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    resetEnvCache();
  }
}

describe("resolveAIProviderSlug", () => {
  it("keeps mock in development", () => {
    withEnv(
      { NODE_ENV: "development", AI_ALLOW_MOCK_PROVIDER: "true" },
      () => {
        assert.equal(resolveAIProviderSlug("mock"), "mock");
      },
    );
  });

  it("redirects mock to kling in production", () => {
    withEnv(
      {
        NODE_ENV: "production",
        AI_ALLOW_MOCK_PROVIDER: "false",
        AI_DEFAULT_PROVIDER: undefined,
      },
      () => {
        assert.equal(resolveAIProviderSlug("mock"), "kling");
      },
    );
  });

  it("respects AI_DEFAULT_PROVIDER in production", () => {
    withEnv(
      {
        NODE_ENV: "production",
        AI_ALLOW_MOCK_PROVIDER: "false",
        AI_DEFAULT_PROVIDER: "veo",
      },
      () => {
        assert.equal(resolveAIProviderSlug("mock"), "veo");
      },
    );
  });
});

describe("resolveAIModelSlug", () => {
  it("maps mock model to kling catalog slug", () => {
    withEnv(
      { NODE_ENV: "production", AI_ALLOW_MOCK_PROVIDER: "false" },
      () => {
        assert.equal(
          resolveAIModelSlug("mock", "video-mock-v1"),
          "video-kling-2.5-std",
        );
      },
    );
  });
});
