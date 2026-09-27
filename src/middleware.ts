import { NextRequest, NextResponse } from "next/server";
import {
  parseSessionTokenEdge,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session-token-edge";

function isAdminTelegramId(telegramUserId: string): boolean {
  const raw = process.env.ADMIN_TELEGRAM_IDS?.trim() ?? "";
  if (!raw) return false;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(telegramUserId);
}

function needsSession(pathname: string): boolean {
  return pathname === "/api/me" || pathname.startsWith("/api/me/");
}

function needsAdminApi(pathname: string): boolean {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

function needsAdminPage(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectApi = needsSession(pathname) || needsAdminApi(pathname);
  const protectPage = needsAdminPage(pathname);

  if (!protectApi && !protectPage) {
    return NextResponse.next();
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (protectPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/mini-app";
      url.search = "";
      return NextResponse.redirect(url);
    }
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
    if (protectPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/mini-app";
      url.search = "";
      return NextResponse.redirect(url);
    }
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

  if (
    (needsAdminApi(pathname) || needsAdminPage(pathname)) &&
    !isAdminTelegramId(session.telegramUserId)
  ) {
    if (protectPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/mini-app";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Admin access required",
        },
      },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/me", "/api/me/:path*", "/api/admin/:path*", "/admin", "/admin/:path*"],
};
