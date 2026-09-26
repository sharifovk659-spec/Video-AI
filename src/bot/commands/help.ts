import type { Bot } from "grammy";
import type { BotContext } from "@/bot/context";
import { getEnv } from "@/lib/config/env";

export function registerHelpCommand(bot: Bot<BotContext>): void {
  bot.command("help", async (ctx) => {
    const appUrl = getEnv().APP_URL.replace(/\/$/, "");
    await ctx.reply(
      `*Vidoo AI — помощь*

/start — приветствие и кнопка создания видео
/profile — ваш профиль и баланс
/help — это сообщение

Студия: ${appUrl}`,
      { parse_mode: "Markdown" },
    );
  });
}
