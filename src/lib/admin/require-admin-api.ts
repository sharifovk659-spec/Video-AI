import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { assertAdminTelegramUser } from "@/lib/security/admin";

export async function requireAdminApiSession() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { telegramAccount: true },
  });

  if (!user?.telegramAccount) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }

  if (user.telegramAccount.telegramUserId.toString() !== session.telegramUserId) {
    throw new AppError("UNAUTHORIZED", "Invalid session");
  }

  assertAdminTelegramUser(user.telegramAccount.telegramUserId);

  if (user.isBlocked) {
    throw new AppError("FORBIDDEN", "Account is blocked");
  }

  return { session, user };
}
