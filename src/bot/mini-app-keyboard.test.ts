import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { resetEnvCache } from "@/lib/config/env";

describe("buildOpenMiniAppKeyboard", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://root:@localhost:3306/vidoo_ai_test";
    process.env.SESSION_SECRET = "test-session-secret-32-characters-long!";
    process.env.TELEGRAM_MINI_APP_URL = "https://video.inovaauto.com/mini-app";
    resetEnvCache();
  });

  afterEach(() => {
    process.env = { ...prev };
    resetEnvCache();
  });

  it("uses web_app button, not url", async () => {
    const { buildOpenMiniAppKeyboard } = await import("@/bot/mini-app-keyboard");
    const kb = buildOpenMiniAppKeyboard("Открыть Vidoo AI");
    const row = kb.inline_keyboard[0]?.[0] as {
      text?: string;
      url?: string;
      web_app?: { url?: string };
    };
    assert.equal(row?.text, "Открыть Vidoo AI");
    assert.equal(row?.url, undefined);
    assert.equal(row?.web_app?.url, "https://video.inovaauto.com/mini-app");
  });

  it("appends optional deep-link path", async () => {
    const { buildOpenMiniAppKeyboard } = await import("@/bot/mini-app-keyboard");
    const kb = buildOpenMiniAppKeyboard("Open", "/generations/abc");
    const row = kb.inline_keyboard[0]?.[0] as {
      web_app?: { url?: string };
    };
    assert.equal(
      row?.web_app?.url,
      "https://video.inovaauto.com/mini-app/generations/abc",
    );
  });
});
