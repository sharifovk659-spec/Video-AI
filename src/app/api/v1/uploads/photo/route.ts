import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getEnv } from "@/lib/config/env";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import { getStorageAdapter } from "@/lib/storage/storage-adapter";
import { uploadExpiryDate } from "@/lib/storage/cleanup";
import { validatePhotoUpload } from "@/lib/uploads/validate-photo";

export const dynamic = "force-dynamic";

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

    const storage = getStorageAdapter();
    const stored = await storage.put("user_uploads", buffer, {
      contentType: validated.mimeType,
      extension: validated.extension,
      scopeId: session.userId,
    });

    const record = await prisma.userPhotoUpload.create({
      data: {
        userId: session.userId,
        storageKey: stored.key,
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
