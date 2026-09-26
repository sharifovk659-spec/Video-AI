import type { ObjectStorage, StoredObject } from "@/lib/storage/types";
import { getStorageAdapter, type StorageKind } from "@/lib/storage/storage-adapter";

/**
 * Thin ObjectStorage façade used by higher-level code.
 * Binary media is never stored in the database — only keys/URLs.
 */
export class LocalObjectStorage implements ObjectStorage {
  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<StoredObject> {
    const parts = key.replace(/\\/g, "/").split("/");
    const kind = (parts[0] ?? "user_uploads") as StorageKind;
    const ext = parts[parts.length - 1]?.split(".").pop() ?? "bin";
    const stored = await getStorageAdapter().put(kind, body, {
      contentType,
      extension: ext,
      scopeId: parts[1],
    });
    return {
      key: stored.key,
      url: stored.publicUrl ?? "",
      contentType,
      sizeBytes: stored.sizeBytes,
    };
  }

  getPublicUrl(key: string): string {
    const publicUrl = getStorageAdapter().getPublicUrl(key);
    if (publicUrl) return publicUrl;
    // Private objects must use signed URLs — do not fabricate open URLs
    throw new Error("Private storage keys require signed access");
  }
}

export const objectStorage: ObjectStorage = new LocalObjectStorage();
