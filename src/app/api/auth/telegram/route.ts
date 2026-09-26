import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateTelegramInitData } from "@/lib/auth/authenticate-telegram-init-data";
import { setSessionCookie } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handle-api-error";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  initData: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const { initData } = bodySchema.parse(json);

    const user = await authenticateTelegramInitData(initData);
    const freeGranted = Math.max(0, user.freeGenerationsGranted || 2);
    const freeRemaining = Math.max(
      0,
      freeGranted - user.freeGenerationsUsed,
    );

    const response = NextResponse.json({
      data: {
        id: user.id,
        telegramUserId: user.telegramAccount.telegramUserId.toString(),
        username: user.telegramAccount.username,
        firstName: user.telegramAccount.firstName,
        lastName: user.telegramAccount.lastName,
        languageCode: user.telegramAccount.languageCode,
        creditBalance: user.creditWallet?.balance ?? 0,
        freeGenerationsUsed: user.freeGenerationsUsed,
        freeGenerationsGranted: freeGranted,
        freeGenerationsRemaining: user.freeQuotaBlocked ? 0 : freeRemaining,
      },
    });

    setSessionCookie(
      response,
      user.id,
      user.telegramAccount.telegramUserId,
    );

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
