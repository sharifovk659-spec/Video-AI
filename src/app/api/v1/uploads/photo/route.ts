import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getEnv } from "@/lib/config/env";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import { uploadExpiryDate } from "@/lib/storage/cleanup";
import { validatePhotoUpload } from "@/lib/uploads/validate-photo";
import { storeUserPhoto } from "@/lib/uploads/user-photo-storage";

export const dynamic = "force-dynamic";

/** Vercel serverless body limit — keep below platform max. */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing file field" } },
        { status: 422 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validated = validatePhotoUpload(
      buffer,
      file.type,
      file.name,
      getEnv().UPLOAD_MAX_BYTES,
    );

    const stored = await storeUserPhoto(
      session.userId,
      buffer,
      validated.mimeType,
      validated.extension,
    );

    const record = await prisma.userPhotoUpload.create({
      data: {
        userId: session.userId,
        storageKey: stored.storageKey,
        dataBytes: stored.dataBytes
          ? new Uint8Array(stored.dataBytes)
          : null,
        originalFileName: file.name.slice(0, 255),
        mimeType: validated.mimeType,
        sizeBytes: stored.sizeBytes,
        expiresAt: uploadExpiryDate(),
        purpose: "user_photo",
      },
    });

    return NextResponse.json({
      data: {
        id: record.id,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
        previewUrl: `/api/v1/uploads/${record.id}`,
        createdAt: record.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
