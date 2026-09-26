import type { Bot } from "grammy";
import type { BotContext } from "@/bot/context";
import { getEnv } from "@/lib/config/env";

const WELCOME_MESSAGE = `✨ *Добро пожаловать в Vidoo AI*

Premium AI-видео для Telegram — шаблоны, стиль и скорость в одном месте.

Нажмите кнопку ниже, чтобы открыть студию и создать своё видео.`;

export function registerStartCommand(bot: Bot<BotContext>): void {
  bot.command("start", async (ctx) => {
    const appUrl = getEnv().APP_URL.replace(/\/$/, "");
    await ctx.reply(WELCOME_MESSAGE, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎬 Создать видео", url: appUrl }],
        ],
      },
    });
  });
}
