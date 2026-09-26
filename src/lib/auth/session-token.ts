import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/config/env";
import { AppError } from "@/lib/errors/app-error";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  type SessionPayload,
} from "@/lib/auth/session-types";

export { SESSION_COOKIE_NAME, SESSION_TTL_MS, type SessionPayload };

function getSessionSecret(): string {
  const secret = getEnv().SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError("INTERNAL_ERROR", "Session secret is not configured", {
      expose: false,
    });
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createSessionToken(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function parseSessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!body || !signature) return null;
  if (!safeEqual(sign(body), signature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.telegramUserId !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildSessionPayload(
  userId: string,
  telegramUserId: bigint,
): SessionPayload {
  return {
    userId,
    telegramUserId: telegramUserId.toString(),
    exp: Date.now() + SESSION_TTL_MS,
  };
}

export function sessionCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
