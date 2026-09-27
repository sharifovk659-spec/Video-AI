import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { createLogger } from "@/lib/logger";

const log = createLogger("admin-free-quota");

export async function adjustUserFreeGenerations(args: {
  userId: string;
  delta: number;
  adminActorId: string;
  note: string;
}): Promise<{
  freeGenerationsGranted: number;
  freeGenerationsUsed: number;
  freeGenerationsRemaining: number;
}> {
  if (args.delta === 0) {
    throw new AppError("VALIDATION_ERROR", "Delta must be non-zero");
  }
  if (!args.note.trim()) {
    throw new AppError("VALIDATION_ERROR", "Audit note is required");
  }

  const user = await prisma.user.findUnique({ where: { id: args.userId } });
  if (!user) {
    throw new AppError("NOT_FOUND", "User not found");
  }

  const previousGranted = user.freeGenerationsGranted;
  const nextGranted = Math.max(0, previousGranted + args.delta);

  const updated = await prisma.user.update({
    where: { id: args.userId },
    data: { freeGenerationsGranted: nextGranted },
  });

  const freeGenerationsRemaining = updated.freeQuotaBlocked
    ? 0
    : Math.max(0, updated.freeGenerationsGranted - updated.freeGenerationsUsed);

  log.info("Admin adjusted free generations", {
    userId: args.userId,
    adminActorId: args.adminActorId,
    delta: args.delta,
    previousGranted,
    nextGranted,
    noteLength: args.note.trim().length,
  });

  return {
    freeGenerationsGranted: updated.freeGenerationsGranted,
    freeGenerationsUsed: updated.freeGenerationsUsed,
    freeGenerationsRemaining,
  };
}
