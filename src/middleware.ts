import { NextRequest, NextResponse } from "next/server";
import {
  parseSessionTokenEdge,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session-token-edge";

const PROTECTED_API_PREFIXES = ["/api/me"] as const;

function isProtectedApiPath(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  if (!isProtectedApiPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Authentication is not configured",
        },
      },
      { status: 503 },
    );
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await parseSessionTokenEdge(token, secret) : null;

  if (!session) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/me"],
};
