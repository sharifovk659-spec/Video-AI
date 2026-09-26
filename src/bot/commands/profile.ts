import type { Bot } from "grammy";
import type { BotContext } from "@/bot/context";
export function registerProfileCommand(bot: Bot<BotContext>): void {
  bot.command("profile", async (ctx) => {
    const record = ctx.dbUser;
    if (!record) {
      await ctx.reply("Не удалось загрузить профиль. Отправьте /start и попробуйте снова.");
      return;
    }

    const { telegramAccount, creditWallet, freeGenerationsUsed } = record;
    const displayName =
      [telegramAccount.firstName, telegramAccount.lastName]
        .filter(Boolean)
        .join(" ") || "—";
    const username = telegramAccount.username
      ? `@${telegramAccount.username}`
      : "—";

    await ctx.reply(
      `*Ваш профиль Vidoo AI*

Имя: ${displayName}
Username: ${username}
Telegram ID: \`${telegramAccount.telegramUserId.toString()}\`
Язык: ${telegramAccount.languageCode ?? "—"}
Premium: ${telegramAccount.isPremium ? "да" : "нет"}

Кредиты: ${creditWallet?.balance ?? 0}
Бесплатных генераций использовано: ${freeGenerationsUsed}`,
      { parse_mode: "Markdown" },
    );
  });
}
