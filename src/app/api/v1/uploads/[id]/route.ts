import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { assertFound } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import {
  deleteUserPhotoStorage,
  readUserPhotoBytes,
} from "@/lib/uploads/user-photo-storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const upload = assertFound(
      await prisma.userPhotoUpload.findFirst({
        where: { id, userId: session.userId },
      }),
      "Upload not found",
    );

    const body = await readUserPhotoBytes(upload);

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": upload.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const upload = assertFound(
      await prisma.userPhotoUpload.findFirst({
        where: { id, userId: session.userId },
      }),
      "Upload not found",
    );

    await deleteUserPhotoStorage(upload);
    await prisma.userPhotoUpload.delete({ where: { id: upload.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
