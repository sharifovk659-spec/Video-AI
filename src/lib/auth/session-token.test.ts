import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

describe("session token", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
    process.env.DATABASE_URL = "mysql://root:@localhost:3308/vidoo_ai";
    process.env.SESSION_SECRET = "test-session-secret-32-characters-long!";
  });

  afterEach(() => {
    process.env = original;
  });

  it("round-trips a valid session token", async () => {
    const { resetEnvCache } = await import("@/lib/config/env");
    resetEnvCache();
    const {
      buildSessionPayload,
      createSessionToken,
      parseSessionToken,
    } = await import("@/lib/auth/session-token");

    const payload = buildSessionPayload(
      "11111111-1111-1111-1111-111111111111",
      BigInt(424242),
    );
    const token = createSessionToken(payload);
    const parsed = parseSessionToken(token);
    assert.equal(parsed?.userId, payload.userId);
    assert.equal(parsed?.telegramUserId, "424242");
  });

  it("rejects tampered session token", async () => {
    const { resetEnvCache } = await import("@/lib/config/env");
    resetEnvCache();
    const {
      buildSessionPayload,
      createSessionToken,
      parseSessionToken,
    } = await import("@/lib/auth/session-token");

    const token = createSessionToken(
      buildSessionPayload("user-id", BigInt(1)),
    );
    const tampered = `${token}x`;
    assert.equal(parseSessionToken(tampered), null);
  });

  it("rejects expired session token", async () => {
    const { resetEnvCache } = await import("@/lib/config/env");
    resetEnvCache();
    const { createSessionToken, parseSessionToken } = await import(
      "@/lib/auth/session-token"
    );

    const token = createSessionToken({
      userId: "user-id",
      telegramUserId: "1",
      exp: Date.now() - 1000,
    });
    assert.equal(parseSessionToken(token), null);
  });
});
