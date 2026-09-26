import { NextResponse } from "next/server";
import { GenerationStatus, PaymentStatus } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import {
  assertFound,
  handleApiError,
} from "@/lib/errors/handle-api-error";
import { getFreeGenerationsLimit } from "@/lib/credits/charge";
import { isAdminTelegramUserId } from "@/lib/admin/is-admin-user";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();

    const user = assertFound(
      await prisma.user.findUnique({
        where: { id: session.userId },
        include: {
          telegramAccount: true,
          creditWallet: true,
          subscriptions: {
            where: { status: "active" },
            orderBy: { currentPeriodEnd: "desc" },
            take: 1,
          },
        },
      }),
    );

    if (user.isBlocked) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Account is blocked" } },
        { status: 403 },
      );
    }

    const tg = user.telegramAccount;
    if (!tg || tg.telegramUserId.toString() !== session.telegramUserId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid session" } },
        { status: 401 },
      );
    }

    const freeLimit =
      user.freeGenerationsGranted || (await getFreeGenerationsLimit());
    const freeRemaining = Math.max(0, freeLimit - user.freeGenerationsUsed);

    const [videosCount, paidCount] = await Promise.all([
      prisma.generation.count({
        where: { userId: user.id, status: GenerationStatus.completed },
      }),
      prisma.payment.count({
        where: { userId: user.id, status: PaymentStatus.paid },
      }),
    ]);

    const plan = user.subscriptions[0]
      ? user.subscriptions[0].planCode
      : paidCount > 0
        ? "credits"
        : "free";

    return NextResponse.json({
      data: {
        id: user.id,
        telegramUserId: tg.telegramUserId.toString(),
        username: tg.username,
        firstName: tg.firstName,
        lastName: tg.lastName,
        languageCode: tg.languageCode,
        isPremium: tg.isPremium,
        photoUrl: tg.photoUrl,
        lastActiveAt: tg.lastActiveAt.toISOString(),
        creditBalance: user.creditWallet?.balance ?? 0,
        creditsReserved: user.creditWallet?.reserved ?? 0,
        freeGenerationsUsed: user.freeGenerationsUsed,
        freeGenerationsGranted: freeLimit,
        freeGenerationsRemaining: user.freeQuotaBlocked ? 0 : freeRemaining,
        freeQuotaBlocked: user.freeQuotaBlocked,
        videosGenerated: videosCount,
        plan,
        isAdmin: isAdminTelegramUserId(tg.telegramUserId),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
