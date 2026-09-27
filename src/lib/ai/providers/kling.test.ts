import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { resetEnvCache } from "@/lib/config/env";
import {
  KlingProvider,
  normalizeDuration,
  parseKlingModelConfig,
} from "@/lib/ai/providers/kling";
import { getEnv } from "@/lib/config/env";

describe("KlingProvider", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetEnvCache();
    process.env.KLING_API_KEY = "test-key";
    delete process.env.KLING_API_BASE_URL;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetEnvCache();
  });

  it("parses model slug into version and mode", () => {
    const env = getEnv();
    assert.deepEqual(parseKlingModelConfig("video-kling-2.5-pro", env), {
      version: "2.5",
      mode: "pro",
    });
  });

  it("normalizes duration to 5 or 10 seconds", () => {
    assert.equal(normalizeDuration(8), 10);
    assert.equal(normalizeDuration(5), 5);
  });

  it("submits PiAPI task and polls completion", async () => {
    let pollCount = 0;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/v1/task") && init?.method === "POST") {
        return new Response(
          JSON.stringify({ data: { task_id: "task-123", status: "pending" } }),
          { status: 200 },
        );
      }
      if (url.includes("/api/v1/task/task-123")) {
        pollCount += 1;
        if (pollCount < 2) {
          return new Response(
            JSON.stringify({ data: { task_id: "task-123", status: "processing" } }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            data: {
              task_id: "task-123",
              status: "completed",
              output: { video_url: "https://cdn.example/v.mp4" },
            },
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    };

    const provider = new KlingProvider();
    const created = await provider.createGeneration({
      generationId: "g1",
      modelSlug: "video-kling-2.5-std",
      prompt: "slow zoom",
      imageUrl: "https://example.com/photo.jpg",
      durationSeconds: 8,
      aspectRatio: "9:16",
    });
    assert.equal(created.providerRequestId, "task-123");

    const processing = await provider.getGenerationStatus(created.providerRequestId);
    assert.equal(processing.status, "processing");

    const done = await provider.getGenerationStatus(created.providerRequestId);
    assert.equal(done.status, "completed");
    assert.equal(done.outputUrl, "https://cdn.example/v.mp4");
  });
});
