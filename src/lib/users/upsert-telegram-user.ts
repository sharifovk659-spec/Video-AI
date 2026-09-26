import type { User, TelegramAccount, CreditWallet } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type TelegramProfileInput = {
  telegramUserId: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
  isPremium?: boolean;
  photoUrl?: string | null;
};

export type TelegramUserRecord = User & {
  telegramAccount: TelegramAccount;
  creditWallet: CreditWallet | null;
};

export async function upsertTelegramUser(
  profile: TelegramProfileInput,
): Promise<TelegramUserRecord> {
  const now = new Date();
  const telegramUserId = profile.telegramUserId;

  const existing = await prisma.telegramAccount.findUnique({
    where: { telegramUserId },
    include: {
      user: { include: { creditWallet: true } },
    },
  });

  if (existing) {
    const telegramAccount = await prisma.telegramAccount.update({
      where: { id: existing.id },
      data: {
        username: profile.username ?? null,
        firstName: profile.firstName ?? null,
        lastName: profile.lastName ?? null,
        languageCode: profile.languageCode ?? null,
        isPremium: profile.isPremium ?? false,
        ...(profile.photoUrl !== undefined
          ? { photoUrl: profile.photoUrl }
          : {}),
        lastActiveAt: now,
      },
    });

    let creditWallet = existing.user.creditWallet;
    if (!creditWallet) {
      creditWallet = await prisma.creditWallet.create({
        data: { userId: existing.userId },
      });
    }

    return {
      ...existing.user,
      telegramAccount,
      creditWallet,
    };
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        freeGenerationsGranted: 2,
        freeGenerationsUsed: 0,
      },
    });
    const telegramAccount = await tx.telegramAccount.create({
      data: {
        userId: user.id,
        telegramUserId,
        username: profile.username ?? null,
        firstName: profile.firstName ?? null,
        lastName: profile.lastName ?? null,
        languageCode: profile.languageCode ?? null,
        isPremium: profile.isPremium ?? false,
        photoUrl: profile.photoUrl ?? null,
        lastActiveAt: now,
      },
    });
    const creditWallet = await tx.creditWallet.create({
      data: { userId: user.id },
    });

    return { ...user, telegramAccount, creditWallet };
  });
}
