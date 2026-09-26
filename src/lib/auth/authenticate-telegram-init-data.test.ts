import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it, beforeEach, afterEach } from "node:test";

function signInitData(
  fields: Record<string, string>,
  botToken: string,
): string {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  params.set("hash", hash);
  return params.toString();
}

describe("authenticateTelegramInitData", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
    process.env.DATABASE_URL = "mysql://root:@localhost:3308/vidoo_ai";
    process.env.SESSION_SECRET = "test-session-secret-32-characters-long!";
    process.env.TELEGRAM_BOT_TOKEN = "123456:ABC-DEF";
  });

  afterEach(() => {
    process.env = original;
  });

  it("rejects empty initData before database access", async () => {
    const { resetEnvCache } = await import("@/lib/config/env");
    resetEnvCache();
    const { authenticateTelegramInitData } = await import(
      "@/lib/auth/authenticate-telegram-init-data"
    );
    const { AppError } = await import("@/lib/errors/app-error");

    await assert.rejects(
      () => authenticateTelegramInitData("hash=bad"),
      (error: unknown) => error instanceof AppError,
    );
  });

  it("rejects initData with invalid signature", async () => {
    const { resetEnvCache } = await import("@/lib/config/env");
    resetEnvCache();
    const { authenticateTelegramInitData } = await import(
      "@/lib/auth/authenticate-telegram-init-data"
    );
    const { AppError } = await import("@/lib/errors/app-error");

    const initData = signInitData(
      {
        auth_date: String(Math.floor(Date.now() / 1000)),
        user: JSON.stringify({ id: 99 }),
      },
      "123456:ABC-DEF",
    );
    const tampered = initData.replace(/hash=[a-f0-9]+/, "hash=deadbeef");

    await assert.rejects(
      () => authenticateTelegramInitData(tampered),
      (error: unknown) => error instanceof AppError,
    );
  });
});
