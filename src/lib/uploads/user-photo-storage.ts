import { randomUUID } from "node:crypto";
import type { UserPhotoUpload } from "@prisma/client";
import { getStorageAdapter } from "@/lib/storage/storage-adapter";

export const DB_PHOTO_KEY_PREFIX = "db:user_uploads/";

export function shouldStoreUserPhotosInDatabase(): boolean {
  if (process.env.VERCEL === "1") return true;
  if (process.env.USE_DB_PHOTO_STORAGE === "true") return true;
  return false;
}

export function isDatabasePhotoKey(storageKey: string): boolean {
  return storageKey.startsWith(DB_PHOTO_KEY_PREFIX);
}

export type StoredUserPhoto = {
  storageKey: string;
  sizeBytes: number;
  dataBytes: Buffer | null;
};

/**
 * Persists a validated user photo. On Vercel, bytes live in MySQL (data_bytes).
 * On Hostinger/local with STORAGE_ROOT, bytes live on disk.
 */
export async function storeUserPhoto(
  userId: string,
  body: Buffer,
  contentType: string,
  extension: string,
): Promise<StoredUserPhoto> {
  if (shouldStoreUserPhotosInDatabase()) {
    const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const scope = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    const storageKey = `${DB_PHOTO_KEY_PREFIX}${scope}/${randomUUID()}.${safeExt}`;
    return {
      storageKey,
      sizeBytes: body.length,
      dataBytes: body,
    };
  }

  const storage = getStorageAdapter();
  const stored = await storage.put("user_uploads", body, {
    contentType,
    extension,
    scopeId: userId,
  });
  return {
    storageKey: stored.key,
    sizeBytes: stored.sizeBytes,
    dataBytes: null,
  };
}

export async function readUserPhotoBytes(
  upload: Pick<UserPhotoUpload, "storageKey" | "dataBytes">,
): Promise<Buffer> {
  if (upload.dataBytes && upload.dataBytes.length > 0) {
    return Buffer.from(upload.dataBytes);
  }
  if (isDatabasePhotoKey(upload.storageKey)) {
    throw new Error("Photo bytes missing for database-backed upload");
  }
  return getStorageAdapter().readObject(upload.storageKey);
}

export async function deleteUserPhotoStorage(
  upload: Pick<UserPhotoUpload, "storageKey" | "dataBytes">,
): Promise<void> {
  if (!isDatabasePhotoKey(upload.storageKey) && upload.dataBytes == null) {
    await getStorageAdapter().deleteObject(upload.storageKey);
  }
}
