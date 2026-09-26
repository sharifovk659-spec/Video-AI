import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
  validateTelegramInitData,
  parseTelegramUserFromInitData,
} from "@/lib/security/telegram-init-data";

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
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

describe("validateTelegramInitData", () => {
  it("accepts valid signature", () => {
    const token = "123456:ABC-DEF";
    const authDate = String(Math.floor(Date.now() / 1000));
    const initData = signInitData(
      {
        auth_date: authDate,
        user: JSON.stringify({ id: 42, first_name: "Test" }),
      },
      token,
    );
    const parsed = validateTelegramInitData(initData, token);
    const user = parseTelegramUserFromInitData(parsed);
    assert.equal(user?.id, 42);
  });

  it("rejects tampered hash", () => {
    const token = "123456:ABC-DEF";
    const initData = signInitData({ auth_date: "1", user: "{}" }, token);
    const tampered = initData.replace(/hash=[a-f0-9]+/, "hash=deadbeef");
    assert.throws(
      () => validateTelegramInitData(tampered, token),
      /Invalid initData/,
    );
  });
});
