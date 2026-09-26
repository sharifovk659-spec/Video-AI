import { getAdminTelegramIds } from "@/lib/config/env";
import { AppError } from "@/lib/errors/app-error";

export function assertAdminTelegramUser(telegramUserId: bigint): void {
  const admins = getAdminTelegramIds();
  if (!admins.some((id) => id === telegramUserId)) {
    throw new AppError("FORBIDDEN", "Admin access required");
  }
}
