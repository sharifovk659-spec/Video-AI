import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

describe("getEnv", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
    process.env.SESSION_SECRET = "test-session-secret-32-characters-long!";
  });

  afterEach(() => {
    process.env = original;
  });

  it("parses required MySQL DATABASE_URL", async () => {
    process.env.DATABASE_URL = "mysql://root:@localhost:3308/vidoo_ai";
    const { getEnv, resetEnvCache } = await import("@/lib/config/env");
    resetEnvCache();
    const env = getEnv();
    assert.equal(env.APP_NAME, "Vidoo AI");
    assert.equal(env.PAYMENTS_ENABLED, false);
  });

  it("rejects non-MySQL DATABASE_URL", async () => {
    process.env.DATABASE_URL = "sqlite://localhost/vidoo_ai";
    const { getEnv, resetEnvCache } = await import("@/lib/config/env");
    resetEnvCache();
    assert.throws(() => getEnv(), /mysql:\/\//);
  });

  it("rejects invalid APP_URL", async () => {
    process.env.DATABASE_URL = "mysql://root:@localhost:3308/vidoo_ai";
    process.env.APP_URL = "not-a-url";
    const { getEnv, resetEnvCache } = await import("@/lib/config/env");
    resetEnvCache();
    assert.throws(() => getEnv(), /Invalid environment configuration/);
  });
});
