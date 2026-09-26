import type { Bot } from "grammy";
import type { BotContext } from "@/bot/context";
import { buildOpenMiniAppKeyboard } from "@/bot/mini-app-keyboard";

export function registerHelpCommand(bot: Bot<BotContext>): void {
  bot.command("help", async (ctx) => {
    await ctx.reply(
      `*Vidoo AI — помощь*

/start — приветствие и кнопка Mini App
/profile — ваш профиль и баланс
/help — это сообщение

Откройте студию кнопкой ниже — приложение откроется внутри Telegram.`,
      {
        parse_mode: "Markdown",
        reply_markup: buildOpenMiniAppKeyboard("Открыть Vidoo AI"),
        link_preview_options: { is_disabled: true },
      },
    );
  });
}
