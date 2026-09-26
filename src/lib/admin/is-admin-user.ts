import { getAdminTelegramIds } from "@/lib/config/env";

export function isAdminTelegramUserId(telegramUserId: bigint): boolean {
  const admins = getAdminTelegramIds();
  return admins.some((id) => id === telegramUserId);
}
