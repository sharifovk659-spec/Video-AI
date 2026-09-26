import { NextResponse } from "next/server";
import { requireSession, clearSessionCookie } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { deleteUserAccount } from "@/lib/privacy/account";

export const dynamic = "force-dynamic";

/** Permanently delete the authenticated account and associated data. */
export async function DELETE() {
  try {
    const session = await requireSession();
    await deleteUserAccount(session.userId);
    const response = NextResponse.json({ data: { deleted: true } });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
