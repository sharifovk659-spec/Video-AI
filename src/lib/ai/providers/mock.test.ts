import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockProvider } from "@/lib/ai/providers/mock";

describe("MockProvider", () => {
  it("creates and completes a generation", async () => {
    const provider = new MockProvider();
    const created = await provider.createGeneration({
      generationId: "g1",
      modelSlug: "video-mock-v1",
      prompt: "test",
    });
    assert.ok(created.providerRequestId.startsWith("mock_"));

    const early = await provider.getGenerationStatus(created.providerRequestId);
    assert.equal(early.status, "processing");

    await new Promise((r) => setTimeout(r, 1600));
    const done = await provider.getGenerationStatus(created.providerRequestId);
    assert.equal(done.status, "completed");
    assert.ok(done.outputUrl);
  });
});
