import { CreditTransactionType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { assertFreeGenerationAllowed } from "@/lib/credits/anti-abuse";

export const DEFAULT_FREE_GENERATIONS = 2;

type Tx = Prisma.TransactionClient;

export async function getFreeGenerationsLimit(
  db: Tx | typeof prisma = prisma,
): Promise<number> {
  const setting = await db.appSetting.findUnique({
    where: { key: "free_generations_per_user" },
  });
  const value = setting?.value;
  if (typeof value === "number" && value >= 0) return value;
  return DEFAULT_FREE_GENERATIONS;
}

async function ensureWallet(tx: Tx, userId: string) {
  const existing = await tx.creditWallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return tx.creditWallet.create({ data: { userId } });
}

/**
 * Atomically reserve free quota or credits before generation starts.
 * Prevents double-spend via conditional updates.
 */
export async function reserveForGeneration(
  tx: Tx,
  args: {
    userId: string;
    generationId: string;
    creditCost: number;
  },
): Promise<{ creditsReserved: number; usedFreeQuota: boolean }> {
  const freeLimit = await getFreeGenerationsLimit(tx);
  const user = await tx.user.findUniqueOrThrow({ where: { id: args.userId } });

  assertFreeGenerationAllowed(user);

  const granted = Math.max(0, user.freeGenerationsGranted || freeLimit);
  const freeRemaining = Math.max(0, granted - user.freeGenerationsUsed);

  if (args.creditCost > 0 && freeRemaining > 0 && !user.freeQuotaBlocked) {
    const freeUpdate = await tx.user.updateMany({
      where: {
        id: args.userId,
        freeQuotaBlocked: false,
        freeGenerationsUsed: { lt: granted },
      },
      data: {
        freeGenerationsUsed: { increment: 1 },
        lastFreeGenerationAt: new Date(),
      },
    });
    if (freeUpdate.count === 0) {
      throw new AppError("CONFLICT", "Free generation already consumed");
    }
    return { creditsReserved: 0, usedFreeQuota: true };
  }

  if (args.creditCost <= 0) {
    return { creditsReserved: 0, usedFreeQuota: false };
  }

  const wallet = await ensureWallet(tx, args.userId);
  const reserved = await tx.creditWallet.updateMany({
    where: {
      id: wallet.id,
      balance: { gte: args.creditCost },
    },
    data: {
      balance: { decrement: args.creditCost },
      reserved: { increment: args.creditCost },
    },
  });

  if (reserved.count === 0) {
    throw new AppError("FORBIDDEN", "Insufficient credits");
  }

  const updated = await tx.creditWallet.findUniqueOrThrow({
    where: { id: wallet.id },
  });

  await tx.creditTransaction.create({
    data: {
      walletId: wallet.id,
      type: CreditTransactionType.reserve,
      amount: args.creditCost,
      balanceAfter: updated.balance,
      reservedAfter: updated.reserved,
      reason: "generation_reserve",
      generationId: args.generationId,
    },
  });

  return { creditsReserved: args.creditCost, usedFreeQuota: false };
}

/**
 * Finalize reserved credits after the AI provider accepts the job.
 * Idempotent via creditsFinalized on the generation.
 */
export async function finalizeGenerationCredits(
  generationId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const generation = await tx.generation.findUnique({
      where: { id: generationId },
    });
    if (!generation || generation.creditsFinalized) return;
    if (generation.usedFreeQuota || generation.creditsReserved <= 0) {
      await tx.generation.update({
        where: { id: generationId },
        data: {
          creditsFinalized: true,
          creditsCharged: generation.creditsReserved,
        },
      });
      return;
    }

    const wallet = await tx.creditWallet.findUnique({
      where: { userId: generation.userId },
    });
    if (!wallet) {
      await tx.generation.update({
        where: { id: generationId },
        data: { creditsFinalized: true },
      });
      return;
    }

    const amount = generation.creditsReserved;
    const updatedReserve = await tx.creditWallet.updateMany({
      where: { id: wallet.id, reserved: { gte: amount } },
      data: { reserved: { decrement: amount } },
    });
    if (updatedReserve.count === 0) {
      throw new AppError("CONFLICT", "Reserved credits missing for finalize");
    }

    const updated = await tx.creditWallet.findUniqueOrThrow({
      where: { id: wallet.id },
    });

    await tx.creditTransaction.create({
      data: {
        walletId: wallet.id,
        type: CreditTransactionType.finalize,
        amount,
        balanceAfter: updated.balance,
        reservedAfter: updated.reserved,
        reason: "generation_finalize",
        generationId,
      },
    });

    await tx.generation.update({
      where: { id: generationId },
      data: {
        creditsFinalized: true,
        creditsCharged: amount,
      },
    });
  });
}

/**
 * Refund reserved or charged credits once. Free quota restored without going negative.
 */
export async function refundGenerationCredits(
  generationId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const generation = await tx.generation.findUnique({
      where: { id: generationId },
    });
    if (!generation || generation.creditsRefunded) return;

    if (generation.usedFreeQuota) {
      await tx.user.updateMany({
        where: {
          id: generation.userId,
          freeGenerationsUsed: { gt: 0 },
        },
        data: { freeGenerationsUsed: { decrement: 1 } },
      });
    }

    const amount =
      generation.creditsReserved > 0
        ? generation.creditsReserved
        : generation.creditsCharged;

    if (amount > 0) {
      const wallet = await tx.creditWallet.findUnique({
        where: { userId: generation.userId },
      });
      if (wallet) {
        if (!generation.creditsFinalized && generation.creditsReserved > 0) {
          await tx.creditWallet.updateMany({
            where: { id: wallet.id, reserved: { gte: amount } },
            data: {
              reserved: { decrement: amount },
              balance: { increment: amount },
            },
          });
        } else {
          await tx.creditWallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: amount } },
          });
        }

        const updated = await tx.creditWallet.findUniqueOrThrow({
          where: { id: wallet.id },
        });

        await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            type: CreditTransactionType.refund,
            amount,
            balanceAfter: updated.balance,
            reservedAfter: updated.reserved,
            reason: "generation_refund",
            generationId,
          },
        });
      }
    }

    await tx.generation.update({
      where: { id: generationId },
      data: {
        creditsRefunded: true,
        creditsReserved: 0,
      },
    });
  });
}

/** Admin manual credit adjustment with immutable audit trail. */
export async function adjustUserCredits(args: {
  userId: string;
  delta: number;
  adminActorId: string;
  note: string;
}): Promise<{ balance: number }> {
  if (args.delta === 0) {
    throw new AppError("VALIDATION_ERROR", "Delta must be non-zero");
  }
  if (!args.note.trim()) {
    throw new AppError("VALIDATION_ERROR", "Audit note is required");
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await ensureWallet(tx, args.userId);

    if (args.delta < 0) {
      const ok = await tx.creditWallet.updateMany({
        where: { id: wallet.id, balance: { gte: Math.abs(args.delta) } },
        data: { balance: { decrement: Math.abs(args.delta) } },
      });
      if (ok.count === 0) {
        throw new AppError("FORBIDDEN", "Insufficient credits to remove");
      }
    } else {
      await tx.creditWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: args.delta } },
      });
    }

    const updated = await tx.creditWallet.findUniqueOrThrow({
      where: { id: wallet.id },
    });

    await tx.creditTransaction.create({
      data: {
        walletId: wallet.id,
        type: CreditTransactionType.adjustment,
        amount: Math.abs(args.delta),
        balanceAfter: updated.balance,
        reservedAfter: updated.reserved,
        reason: args.delta > 0 ? "admin_credit_add" : "admin_credit_remove",
        note: args.note.slice(0, 512),
        adminActorId: args.adminActorId,
        metadata: { delta: args.delta },
      },
    });

    return { balance: updated.balance };
  });
}

export async function grantCreditsFromPayment(args: {
  userId: string;
  paymentId: string;
  credits: number;
}): Promise<void> {
  if (args.credits <= 0) return;

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: args.paymentId } });
    if (!payment || payment.creditsGranted) return;

    const wallet = await ensureWallet(tx, args.userId);
    const updated = await tx.creditWallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: args.credits } },
    });

    await tx.creditTransaction.create({
      data: {
        walletId: wallet.id,
        type: CreditTransactionType.credit,
        amount: args.credits,
        balanceAfter: updated.balance,
        reservedAfter: updated.reserved,
        reason: "payment_credit_grant",
        paymentId: args.paymentId,
      },
    });

    await tx.payment.update({
      where: { id: args.paymentId },
      data: { creditsGranted: true },
    });
  });
}
