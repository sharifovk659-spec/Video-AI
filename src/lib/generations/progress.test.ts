import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generationProgressPercent } from "@/lib/generations/progress";

describe("generationProgressPercent", () => {
  const createdAt = new Date("2026-09-27T00:00:00.000Z");

  it("starts at 1% when queued", () => {
    assert.equal(
      generationProgressPercent({
        status: "queued",
        stage: "queued",
        createdAt,
        now: createdAt.getTime(),
      }),
      1,
    );
  });

  it("does not jump to 20 or 25 on submit", () => {
    const value = generationProgressPercent({
      status: "processing",
      stage: "submitting",
      createdAt,
      now: createdAt.getTime() + 1000,
    });
    assert.ok(value < 20);
    assert.ok(value >= 8);
  });

  it("reaches 100 only when completed", () => {
    assert.equal(
      generationProgressPercent({
        status: "completed",
        stage: "completed",
        createdAt,
        now: createdAt.getTime(),
      }),
      100,
    );
  });
});
