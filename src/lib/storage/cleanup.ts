import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/config/env";
import { getStorageAdapter } from "@/lib/storage/storage-adapter";
import { deleteUserPhotoStorage } from "@/lib/uploads/user-photo-storage";
import { createLogger } from "@/lib/logger";

const log = createLogger("storage-cleanup");

/**
 * Deletes expired temporary uploads that were never used by a generation.
 * Removes disk objects and/or inline DB bytes for expired uploads.
 */
export async function cleanupExpiredUploads(limit = 50): Promise<number> {
  const now = new Date();
  const expired = await prisma.userPhotoUpload.findMany({
    where: {
      expiresAt: { lte: now },
      generations: { none: {} },
    },
    take: limit,
    select: { id: true, storageKey: true },
  });

  if (expired.length === 0) return 0;

  let deleted = 0;
  for (const row of expired) {
    const full = await prisma.userPhotoUpload.findUnique({
      where: { id: row.id },
    });
    if (full) await deleteUserPhotoStorage(full);
    await prisma.userPhotoUpload
      .delete({ where: { id: row.id } })
      .catch(() => undefined);
    deleted += 1;
  }

  if (deleted > 0) {
    log.info("Cleaned expired uploads", { deleted });
  }
  return deleted;
}

/**
 * Removes orphaned generated-video objects with no matching generation row.
 * Best-effort local-disk hygiene — skipped for remote providers later.
 */
export async function cleanupOrphanGeneratedVideos(
  limit = 20,
): Promise<number> {
  if (getEnv().STORAGE_PROVIDER !== "local") return 0;

  const storage = getStorageAdapter();
  const keys = await storage.listKeys("generated_videos");
  let deleted = 0;

  for (const key of keys) {
    if (deleted >= limit) break;
    const generationId = key.split("/")[1];
    if (!generationId) continue;
    const exists = await prisma.generation.findUnique({
      where: { id: generationId },
      select: { id: true, outputStorageKey: true },
    });
    if (!exists || exists.outputStorageKey !== key) {
      // Only delete if generation missing, or key no longer referenced
      if (!exists) {
        await storage.deleteObject(key);
        deleted += 1;
      }
    }
  }

  if (deleted > 0) {
    log.info("Cleaned orphan generated videos", { deleted });
  }
  return deleted;
}

export function uploadExpiryDate(from = new Date()): Date {
  const hours = getEnv().UPLOAD_TEMP_TTL_HOURS;
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}
