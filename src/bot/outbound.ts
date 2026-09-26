import { Bot } from "grammy";
import type { BotContext } from "@/bot/context";
import { getEnv } from "@/lib/config/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("bot-outbound");

let bot: Bot<BotContext> | null = null;

/**
 * Lightweight outbound bot for worker notifications (no command middleware).
 * Avoids marketing spam — callers must only send transactional messages.
 */
export function getOutboundBot(): Bot<BotContext> | null {
  const token = getEnv().TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  if (!bot) {
    bot = new Bot<BotContext>(token);
    log.info("Outbound Telegram bot ready");
  }
  return bot;
}

export function resetOutboundBot(): void {
  bot = null;
}
