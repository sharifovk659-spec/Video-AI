import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateContentSafety } from "@/lib/moderation/pre-generation";
import { toPublicTemplateListItem } from "@/lib/templates/public-template";
import { validateTelegramInitData, parseTelegramUserFromInitData } from "@/lib/security/telegram-init-data";
import { createHmac } from "node:crypto";

function signInitData(botToken: string, fields: Record<string, string>) {
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

describe("content safety / moderation", () => {
  it("allows normal creative prompts", () => {
    const r = evaluateContentSafety("cinematic golden hour portrait with soft light");
    assert.equal(r.allowed, true);
  });

  it("blocks deceptive deepfake / impersonation language", () => {
    const r = evaluateContentSafety("make a deepfake of this celebrity");
    assert.equal(r.allowed, false);
    assert.equal(r.code, "DECEPTIVE_DEEPFAKE");
  });

  it("blocks abusive content", () => {
    const r = evaluateContentSafety("create child porn content");
    assert.equal(r.allowed, false);
  });
});

describe("template prompt privacy", () => {
  it("public mapper never includes prompt or negativePrompt", () => {
    const item = toPublicTemplateListItem({
      id: "t1",
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryId: "c1",
      aiModelId: "m1",
      slug: "demo",
      title: "Demo",
      description: "Public desc",
      thumbnailUrl: null,
      coverUrl: null,
      previewVideoUrl: null,
      coverStorageKey: null,
      previewStorageKey: null,
      durationSeconds: 8,
      aspectRatio: "9:16",
      isTrending: false,
      isNew: false,
      isPopular: false,
      estimatedApiCostCents: 1,
      status: "active",
      isPro: false,
      creditCost: 1,
      prompt: "SECRET_INTERNAL_PROMPT",
      negativePrompt: "SECRET_NEGATIVE",
      sortOrder: 0,
      currentVersion: 1,
      clonedFromId: null,
      category: {
        id: "c1",
        createdAt: new Date(),
        updatedAt: new Date(),
        slug: "fun",
        name: "Fun",
        description: null,
        sortOrder: 0,
        isActive: true,
      },
    } as never);

    const json = JSON.stringify(item);
    assert.equal(json.includes("SECRET_INTERNAL_PROMPT"), false);
    assert.equal(json.includes("SECRET_NEGATIVE"), false);
    assert.equal(json.includes("prompt"), false);
  });
});

describe("Telegram authentication foundations", () => {
  const token = "123456:ABC-DEF";

  it("accepts valid initData signature", () => {
    const initData = signInitData(token, {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 42, first_name: "Test" }),
    });
    const fields = validateTelegramInitData(initData, token);
    const user = parseTelegramUserFromInitData(fields);
    assert.equal(user?.id, 42);
  });

  it("rejects invalid signature", () => {
    assert.throws(() =>
      validateTelegramInitData(
        "auth_date=1&user=%7B%22id%22%3A1%7D&hash=deadbeef",
        token,
      ),
    );
  });
});

describe("authorization session tokens", () => {
  it("round-trips session tokens", async () => {
    process.env.SESSION_SECRET =
      "test-session-secret-32-characters-long!!";
    const { resetEnvCache } = await import("@/lib/config/env");
    resetEnvCache();
    const { createSessionToken, parseSessionToken, buildSessionPayload } =
      await import("@/lib/auth/session-token");
    const payload = buildSessionPayload("user-1", BigInt(99));
    const token = createSessionToken(payload);
    const parsed = parseSessionToken(token);
    assert.equal(parsed?.userId, "user-1");
    assert.equal(parsed?.telegramUserId, "99");
  });
});
