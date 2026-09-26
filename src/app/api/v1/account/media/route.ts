import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { deleteUserMedia } from "@/lib/privacy/account";

export const dynamic = "force-dynamic";

/** Delete the authenticated user's uploaded media and stored outputs. */
export async function DELETE() {
  try {
    const session = await requireSession();
    const result = await deleteUserMedia(session.userId);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
