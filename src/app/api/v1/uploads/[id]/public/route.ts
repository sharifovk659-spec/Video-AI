import { NextRequest, NextResponse } from "next/server";
import { handleApiError, assertFound } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import { getStorageAdapter } from "@/lib/storage/storage-adapter";
import { verifyUploadAccessToken } from "@/lib/uploads/signed-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Provider-facing photo access via short-lived signed token (no session cookie). */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Missing token" } }, { status: 401 });
    }
    const verified = verifyUploadAccessToken(token);
    if (!verified || verified.uploadId !== id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
    }

    const upload = assertFound(
      await prisma.userPhotoUpload.findFirst({
        where: { id, userId: verified.userId },
      }),
    );

    const body = await getStorageAdapter().readObject(upload.storageKey);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": upload.mimeType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
