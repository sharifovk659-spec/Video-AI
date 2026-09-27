import { prisma } from "@/lib/db/prisma";
import { getStorageAdapter } from "@/lib/storage/storage-adapter";
import { AppError } from "@/lib/errors/app-error";
import { createLogger } from "@/lib/logger";

const log = createLogger("privacy");

export type RetentionSettings = {
  uploadsDays: number;
  outputsDays: number;
  inactiveAccountDays: number;
};

export async function getRetentionSettings(): Promise<RetentionSettings> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          "retention_uploads_days",
          "retention_outputs_days",
          "retention_account_inactive_days",
        ],
      },
    },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    uploadsDays:
      typeof map.retention_uploads_days === "number"
        ? map.retention_uploads_days
        : 30,
    outputsDays:
      typeof map.retention_outputs_days === "number"
        ? map.retention_outputs_days
        : 90,
    inactiveAccountDays:
      typeof map.retention_account_inactive_days === "number"
        ? map.retention_account_inactive_days
        : 365,
  };
}

/** Delete all of a user's uploaded photos from storage + DB. */
export async function deleteUserMedia(userId: string): Promise<{ deleted: number }> {
  const uploads = await prisma.userPhotoUpload.findMany({
    where: { userId },
  });
  const { deleteUserPhotoStorage } = await import(
    "@/lib/uploads/user-photo-storage"
  );
  const storage = getStorageAdapter();
  for (const u of uploads) {
    await deleteUserPhotoStorage(u);
  }
  // Detach from generations then delete rows
  await prisma.generation.updateMany({
    where: { userId, photoUploadId: { not: null } },
    data: { photoUploadId: null },
  });
  const result = await prisma.userPhotoUpload.deleteMany({ where: { userId } });

  // Remove locally stored generated videos for this user
  const gens = await prisma.generation.findMany({
    where: { userId, outputStorageKey: { not: null } },
    select: { id: true, outputStorageKey: true },
  });
  for (const g of gens) {
    if (g.outputStorageKey) await storage.deleteObject(g.outputStorageKey);
  }
  await prisma.generation.updateMany({
    where: { userId },
    data: { outputStorageKey: null, outputUrl: null },
  });

  log.info("User media deleted", { userId, deleted: result.count });
  return { deleted: result.count };
}

/**
 * Full account deletion (GDPR-style). Cascades wipe auth, wallet, gens, favorites.
 * Storage objects cleaned first.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("NOT_FOUND", "Account not found");

  await deleteUserMedia(userId);
  await prisma.user.delete({ where: { id: userId } });
  log.info("User account deleted", { userId });
}
