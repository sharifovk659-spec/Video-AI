import type { MiddlewareFn } from "grammy";
import type { BotContext } from "@/bot/context";
import { upsertTelegramUser } from "@/lib/users/upsert-telegram-user";

export const syncTelegramUserMiddleware: MiddlewareFn<BotContext> = async (
  ctx,
  next,
) => {
  const from = ctx.from;
  if (from) {
    ctx.dbUser = await upsertTelegramUser({
      telegramUserId: BigInt(from.id),
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      languageCode: from.language_code ?? null,
      isPremium: from.is_premium ?? false,
    });
  }
  await next();
};
