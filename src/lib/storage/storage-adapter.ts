import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { getEnv } from "@/lib/config/env";

/** Logical object namespaces — never mix user uploads with public template media. */
export type StorageKind =
  | "user_uploads"
  | "template_covers"
  | "template_previews"
  | "generated_videos";

export const PUBLIC_STORAGE_KINDS: ReadonlySet<StorageKind> = new Set([
  "template_covers",
  "template_previews",
]);

export type StoragePutResult = {
  key: string;
  kind: StorageKind;
  absolutePath: string;
  sizeBytes: number;
  contentType: string;
  publicUrl: string | null;
};

export type StoragePutOptions = {
  contentType: string;
  extension: string;
  /** Optional owner / generation scoping for unique key paths */
  scopeId?: string;
};

export interface StorageAdapter {
  put(
    kind: StorageKind,
    body: Buffer,
    options: StoragePutOptions,
  ): Promise<StoragePutResult>;
  /** @deprecated Prefer put(kind, ...) */
  putUserPhoto(
    userId: string,
    body: Buffer,
    contentType: string,
    extension: string,
  ): Promise<StoragePutResult>;
  readObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  resolveSafeKey(key: string): string;
  isPublicKey(key: string): boolean;
  getPublicUrl(key: string): string | null;
  listKeys(kind: StorageKind): Promise<string[]>;
}

function storageRoot(): string {
  const fromEnv = process.env.STORAGE_ROOT?.trim();
  if (fromEnv && fromEnv.length > 0) {
    // Absolute Hostinger path — must not be statically traced by Turbopack.
    return path.resolve(/* turbopackIgnore: true */ fromEnv);
  }
  return path.join(process.cwd(), "storage", "objects");
}

function kindFromKey(key: string): StorageKind | null {
  const prefix = key.split("/")[0];
  if (
    prefix === "user_uploads" ||
    prefix === "template_covers" ||
    prefix === "template_previews" ||
    prefix === "generated_videos"
  ) {
    return prefix;
  }
  // Legacy keys under storage/uploads/users/...
  if (key.startsWith("users/")) return "user_uploads";
  return null;
}

export class LocalStorageAdapter implements StorageAdapter {
  resolveSafeKey(key: string): string {
    const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
    if (
      normalized.includes("..") ||
      path.isAbsolute(normalized) ||
      normalized.includes("\0")
    ) {
      throw new Error("Invalid storage key");
    }
    return normalized;
  }

  private absolutePathForKey(key: string): string {
    const safeKey = this.resolveSafeKey(key);
    // Legacy photo keys lived under storage/uploads
    if (safeKey.startsWith("users/")) {
      const legacyRoot = path.resolve(
        path.join(process.cwd(), "storage", "uploads"),
      );
      const full = path.join(legacyRoot, safeKey);
      if (!full.startsWith(legacyRoot + path.sep) && full !== legacyRoot) {
        throw new Error("Path traversal blocked");
      }
      return full;
    }
    const root = path.resolve(/* turbopackIgnore: true */ storageRoot());
    const full = path.join(/* turbopackIgnore: true */ root, safeKey);
    if (!full.startsWith(root + path.sep) && full !== root) {
      throw new Error("Path traversal blocked");
    }
    return full;
  }

  isPublicKey(key: string): boolean {
    const kind = kindFromKey(this.resolveSafeKey(key));
    return kind ? PUBLIC_STORAGE_KINDS.has(kind) : false;
  }

  getPublicUrl(key: string): string | null {
    const safe = this.resolveSafeKey(key);
    if (!this.isPublicKey(safe)) return null;
    const base = getEnv().APP_URL.replace(/\/$/, "");
    return `${base}/api/v1/media/${safe
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
  }

  async put(
    kind: StorageKind,
    body: Buffer,
    options: StoragePutOptions,
  ): Promise<StoragePutResult> {
    const safeExt = options.extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const scope = options.scopeId
      ? options.scopeId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)
      : "shared";
    const key = `${kind}/${scope}/${randomUUID()}.${safeExt}`;
    const safeKey = this.resolveSafeKey(key);
    const absolutePath = this.absolutePathForKey(safeKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, body);
    return {
      key: safeKey,
      kind,
      absolutePath,
      sizeBytes: body.length,
      contentType: options.contentType,
      publicUrl: PUBLIC_STORAGE_KINDS.has(kind)
        ? this.getPublicUrl(safeKey)
        : null,
    };
  }

  async putUserPhoto(
    userId: string,
    body: Buffer,
    contentType: string,
    extension: string,
  ): Promise<StoragePutResult> {
    return this.put("user_uploads", body, {
      contentType,
      extension,
      scopeId: userId,
    });
  }

  async readObject(key: string): Promise<Buffer> {
    return readFile(this.absolutePathForKey(key));
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await unlink(this.absolutePathForKey(key));
    } catch {
      /* ignore missing */
    }
  }

  async listKeys(kind: StorageKind): Promise<string[]> {
    const root = path.join(storageRoot(), kind);
    const out: string[] = [];
    async function walk(dir: string, prefix: string) {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const next = path.join(dir, entry.name);
        const key = `${prefix}/${entry.name}`.replace(/\\/g, "/");
        if (entry.isDirectory()) await walk(next, key);
        else {
          const s = await stat(next);
          if (s.isFile()) out.push(key);
        }
      }
    }
    await walk(root, kind);
    return out;
  }
}

let adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (!adapter) {
    void getEnv().STORAGE_PROVIDER;
    adapter = new LocalStorageAdapter();
  }
  return adapter;
}

/** @internal tests */
export function resetStorageAdapter(): void {
  adapter = null;
}
