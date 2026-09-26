import { getEnv } from "@/lib/config/env";
import { AppError } from "@/lib/errors/app-error";
import {
  parseTelegramUserFromInitData,
  validateTelegramInitData,
} from "@/lib/security/telegram-init-data";
import { upsertTelegramUser } from "@/lib/users/upsert-telegram-user";

export async function authenticateTelegramInitData(initData: string) {
  const token = getEnv().TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new AppError("SERVICE_UNAVAILABLE", "Telegram auth is not configured", {
      expose: false,
    });
  }

  const fields = validateTelegramInitData(initData, token);
  const tgUser = parseTelegramUserFromInitData(fields);
  if (!tgUser?.id) {
    throw new AppError("UNAUTHORIZED", "Telegram user missing from initData");
  }

  const user = await upsertTelegramUser({
    telegramUserId: BigInt(tgUser.id),
    username: tgUser.username ?? null,
    firstName: tgUser.first_name ?? null,
    lastName: tgUser.last_name ?? null,
    languageCode: tgUser.language_code ?? null,
    isPremium: tgUser.is_premium ?? false,
    photoUrl: tgUser.photo_url ?? null,
  });

  if (user.isBlocked) {
    throw new AppError("FORBIDDEN", "Account is blocked");
  }

  return user;
}
