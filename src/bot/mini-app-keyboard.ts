import { InlineKeyboard } from "grammy";
import { getEnv } from "@/lib/config/env";

/** Canonical Mini App URL (no trailing slash). */
export function getMiniAppUrl(): string {
  return getEnv().TELEGRAM_MINI_APP_URL.replace(/\/$/, "");
}

/**
 * Inline keyboard with a real Telegram Web App button (`web_app`).
 * Do not use `url` here — that opens an external browser.
 */
export function buildOpenMiniAppKeyboard(
  label = "Открыть Vidoo AI",
  path = "",
): InlineKeyboard {
  const base = getMiniAppUrl();
  const suffix = path
    ? path.startsWith("/")
      ? path
      : `/${path}`
    : "";
  return new InlineKeyboard().webApp(label, `${base}${suffix}`);
}
