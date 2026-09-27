import { randomUUID } from "node:crypto";
import { getEnv } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { getStorageAdapter } from "@/lib/storage/storage-adapter";

export const DB_TEMPLATE_COVER_PREFIX = "db:template_covers/";
export const DB_TEMPLATE_PREVIEW_PREFIX = "db:template_previews/";

export function shouldStoreTemplateMediaInDatabase(): boolean {
  if (process.env.VERCEL === "1") return true;
  if (process.env.USE_DB_PHOTO_STORAGE === "true") return true;
  return false;
}

export function isDatabaseTemplateMediaKey(storageKey: string): boolean {
  return (
    storageKey.startsWith(DB_TEMPLATE_COVER_PREFIX) ||
    storageKey.startsWith(DB_TEMPLATE_PREVIEW_PREFIX)
  );
}

export function templateMediaPublicUrl(storageKey: string): string {
  const base = getEnv().APP_URL.replace(/\/$/, "");
  const path = storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${base}/api/v1/media/${path}`;
}

export async function storeTemplateMedia(params: {
  kind: "cover" | "preview";
  body: Buffer;
  mimeType: string;
  extension: string;
}): Promise<{ storageKey: string; url: string; sizeBytes: number }> {
  const safeExt = params.extension.replace(/[^a-z0-9]/gi, "").toLowerCase();

  if (shouldStoreTemplateMediaInDatabase()) {
    const prefix =
      params.kind === "cover"
        ? DB_TEMPLATE_COVER_PREFIX
        : DB_TEMPLATE_PREVIEW_PREFIX;
    const storageKey = `${prefix}${randomUUID()}.${safeExt}`;
    await prisma.templateMediaObject.create({
      data: {
        storageKey,
        kind: params.kind,
        mimeType: params.mimeType,
        sizeBytes: params.body.length,
        dataBytes: new Uint8Array(params.body),
      },
    });
    return {
      storageKey,
      url: templateMediaPublicUrl(storageKey),
      sizeBytes: params.body.length,
    };
  }

  const storage = getStorageAdapter();
  const stored = await storage.put(
    params.kind === "cover" ? "template_covers" : "template_previews",
    params.body,
    {
      contentType: params.mimeType,
      extension: safeExt,
      scopeId: "templates",
    },
  );
  const url = stored.publicUrl ?? templateMediaPublicUrl(stored.key);
  return { storageKey: stored.key, url, sizeBytes: stored.sizeBytes };
}

export async function readTemplateMediaBytes(
  storageKey: string,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  if (!isDatabaseTemplateMediaKey(storageKey)) return null;
  const row = await prisma.templateMediaObject.findUnique({
    where: { storageKey },
  });
  if (!row) return null;
  return { bytes: Buffer.from(row.dataBytes), mimeType: row.mimeType };
}

export async function deleteTemplateMedia(storageKey: string | null | undefined) {
  if (!storageKey) return;
  if (isDatabaseTemplateMediaKey(storageKey)) {
    await prisma.templateMediaObject.deleteMany({ where: { storageKey } });
    return;
  }
  if (
    storageKey.startsWith("template_covers/") ||
    storageKey.startsWith("template_previews/")
  ) {
    await getStorageAdapter().deleteObject(storageKey);
  }
}
