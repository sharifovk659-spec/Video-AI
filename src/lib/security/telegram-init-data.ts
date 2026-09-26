import { createHmac } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";

export type TelegramWebAppUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

/**
 * Validates Telegram Mini App initData (WebAppData).
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
): Record<string, string> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new AppError("UNAUTHORIZED", "Missing initData hash");
  }
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculated = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculated !== hash) {
    throw new AppError("UNAUTHORIZED", "Invalid initData signature");
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate)) {
    throw new AppError("UNAUTHORIZED", "Invalid auth_date");
  }

  const maxAgeSec = 60 * 60 * 24;
  if (Math.floor(Date.now() / 1000) - authDate > maxAgeSec) {
    throw new AppError("UNAUTHORIZED", "initData expired");
  }

  return Object.fromEntries(params.entries());
}

export function parseTelegramUserFromInitData(
  fields: Record<string, string>,
): TelegramWebAppUser | null {
  const raw = fields.user;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TelegramWebAppUser;
  } catch {
    throw new AppError("UNAUTHORIZED", "Invalid user payload in initData");
  }
}
