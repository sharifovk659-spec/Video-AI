import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generatedVideoPosterTime } from "@/lib/mini-app/result-video-time";

describe("generated video poster time", () => {
  it("uses a frame after the opening still", () => {
    assert.equal(generatedVideoPosterTime(5), 1);
    assert.equal(generatedVideoPosterTime(9), 1.5);
  });

  it("stays inside a short clip", () => {
    const at = generatedVideoPosterTime(0.8);
    assert.ok(at > 0 && at < 0.8);
  });

  it("does not seek when duration is unknown", () => {
    assert.equal(generatedVideoPosterTime(0), 0);
    assert.equal(generatedVideoPosterTime(Number.NaN), 0);
  });
});
