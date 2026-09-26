import type { Bot } from "grammy";
import type { BotContext } from "@/bot/context";
import { buildOpenMiniAppKeyboard } from "@/bot/mini-app-keyboard";
import { getFreeGenerationsLimit } from "@/lib/credits/charge";

export function registerProfileCommand(bot: Bot<BotContext>): void {
  bot.command("profile", async (ctx) => {
    const record = ctx.dbUser;
    if (!record) {
      await ctx.reply(
        "Не удалось загрузить профиль. Отправьте /start и попробуйте снова.",
      );
      return;
    }

    const { telegramAccount, creditWallet, freeGenerationsUsed, freeGenerationsGranted } =
      record;
    const displayName =
      [telegramAccount.firstName, telegramAccount.lastName]
        .filter(Boolean)
        .join(" ") || "—";
    const username = telegramAccount.username
      ? `@${telegramAccount.username}`
      : "—";

    const freeLimit =
      freeGenerationsGranted > 0
        ? freeGenerationsGranted
        : await getFreeGenerationsLimit();
    const freeLeft = Math.max(0, freeLimit - freeGenerationsUsed);

    await ctx.reply(
      `*Ваш профиль Vidoo AI*

Имя: ${displayName}
Username: ${username}
Telegram ID: \`${telegramAccount.telegramUserId.toString()}\`
Язык: ${telegramAccount.languageCode ?? "—"}
Premium: ${telegramAccount.isPremium ? "да" : "нет"}

Кредиты: ${creditWallet?.balance ?? 0}
Бесплатных генераций: ${freeLeft} из ${freeLimit}`,
      {
        parse_mode: "Markdown",
        reply_markup: buildOpenMiniAppKeyboard("Открыть Vidoo AI"),
        link_preview_options: { is_disabled: true },
      },
    );
  });
}
