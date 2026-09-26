import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreSignupRisk } from "@/lib/credits/anti-abuse";
import { DEFAULT_FREE_GENERATIONS } from "@/lib/credits/charge";

describe("monetization foundations", () => {
  it("defaults free generations to exactly 2", () => {
    assert.equal(DEFAULT_FREE_GENERATIONS, 2);
  });

  it("scores fingerprint farming risk", () => {
    assert.ok(scoreSignupRisk({ fingerprint: "x", existingAccountsWithFingerprint: 5 }) >= 80);
    assert.equal(scoreSignupRisk({ fingerprint: null }), 0);
  });
});
