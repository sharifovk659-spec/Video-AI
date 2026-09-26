import type { Bot } from "grammy";
import type { BotContext } from "@/bot/context";
import { buildOpenMiniAppKeyboard } from "@/bot/mini-app-keyboard";

const WELCOME_MESSAGE = `✨ *Добро пожаловать в Vidoo AI*

Premium AI-видео для Telegram — шаблоны, стиль и скорость в одном месте.

Нажмите кнопку ниже, чтобы открыть студию прямо в Telegram.`;

export function registerStartCommand(bot: Bot<BotContext>): void {
  bot.command("start", async (ctx) => {
    await ctx.reply(WELCOME_MESSAGE, {
      parse_mode: "Markdown",
      reply_markup: buildOpenMiniAppKeyboard("Открыть Vidoo AI"),
      link_preview_options: { is_disabled: true },
    });
  });
}
