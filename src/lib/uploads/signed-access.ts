import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/config/env";

const DEFAULT_TTL_MS = 60 * 60 * 1000;

function secret(): string {
  return getEnv().SESSION_SECRET ?? "dev-only-session-secret-32chars-minimum!!";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function verifySig(payload: string, sig: string): boolean {
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createUploadAccessToken(
  uploadId: string,
  userId: string,
  ttlMs = DEFAULT_TTL_MS,
): string {
  const exp = Date.now() + ttlMs;
  const payload = Buffer.from(
    JSON.stringify({ typ: "upload", uploadId, userId, exp }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyUploadAccessToken(
  token: string,
): { uploadId: string; userId: string } | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !verifySig(payload, sig)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      typ?: string;
      uploadId: string;
      userId: string;
      exp: number;
    };
    if (data.exp < Date.now()) return null;
    if (!data.uploadId || !data.userId) return null;
    return { uploadId: data.uploadId, userId: data.userId };
  } catch {
    return null;
  }
}

/** Signed access bound to a specific object-storage key (private media). */
export function createObjectAccessToken(
  key: string,
  userId: string,
  ttlMs = DEFAULT_TTL_MS,
): string {
  const exp = Date.now() + ttlMs;
  const payload = Buffer.from(
    JSON.stringify({ typ: "object", key, userId, exp }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyObjectAccessToken(
  token: string,
): { key: string; userId: string } | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !verifySig(payload, sig)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      typ?: string;
      key: string;
      userId: string;
      exp: number;
    };
    if (data.typ !== "object") return null;
    if (data.exp < Date.now()) return null;
    if (!data.key || !data.userId) return null;
    return { key: data.key, userId: data.userId };
  } catch {
    return null;
  }
}
