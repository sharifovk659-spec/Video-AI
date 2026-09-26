import type { User } from "@prisma/client";
import { AppError } from "@/lib/errors/app-error";

const MIN_FREE_INTERVAL_MS = 8_000;

/**
 * Foundations against free-generation farming.
 * Expand with device graphs / photo hashes later.
 */
export function assertFreeGenerationAllowed(user: User): void {
  if (user.isBlocked) {
    throw new AppError("FORBIDDEN", "Account is blocked");
  }
  if (user.freeQuotaBlocked) {
    throw new AppError("FORBIDDEN", "Free generations are disabled for this account");
  }
  if (user.abuseScore >= 100) {
    throw new AppError("FORBIDDEN", "Account flagged for abuse review");
  }
}

export function assertFreeGenerationPacing(user: User): void {
  if (!user.lastFreeGenerationAt) return;
  const elapsed = Date.now() - user.lastFreeGenerationAt.getTime();
  if (elapsed < MIN_FREE_INTERVAL_MS) {
    throw new AppError(
      "CONFLICT",
      "Please wait a moment before using another free generation",
    );
  }
}

export function scoreSignupRisk(input: {
  fingerprint?: string | null;
  existingAccountsWithFingerprint?: number;
}): number {
  let score = 0;
  if (input.fingerprint && (input.existingAccountsWithFingerprint ?? 0) >= 3) {
    score += 40;
  }
  if ((input.existingAccountsWithFingerprint ?? 0) >= 5) {
    score += 40;
  }
  return score;
}
