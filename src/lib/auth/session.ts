import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import type { SessionPayload } from "@/lib/auth/session-types";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-types";
import {
  buildSessionPayload,
  createSessionToken,
  parseSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session-token";

export { SESSION_COOKIE_NAME, parseSessionToken, type SessionPayload };

export function setSessionCookie(
  response: NextResponse,
  userId: string,
  telegramUserId: bigint,
): void {
  const token = createSessionToken(
    buildSessionPayload(userId, telegramUserId),
  );
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  return session;
}
