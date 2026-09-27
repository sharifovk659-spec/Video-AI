import { getSessionFromCookies } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isAdminTelegramUserId } from "@/lib/admin/is-admin-user";

export type AdminPageAccess =
  | { ok: true; userId: string; telegramUserId: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

/**
 * Server-side gate for /admin pages. Hiding UI is not enough —
 * this runs on the server before admin UI is rendered.
 */
export async function getAdminPageAccess(): Promise<AdminPageAccess> {
  const session = await getSessionFromCookies();
  if (!session) {
    return { ok: false, reason: "unauthenticated" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { telegramAccount: true },
  });

  const tg = user?.telegramAccount;
  if (!tg || tg.telegramUserId.toString() !== session.telegramUserId) {
    return { ok: false, reason: "unauthenticated" };
  }

  if (user.isBlocked || !isAdminTelegramUserId(tg.telegramUserId)) {
    return { ok: false, reason: "forbidden" };
  }

  return {
    ok: true,
    userId: user.id,
    telegramUserId: session.telegramUserId,
  };
}
