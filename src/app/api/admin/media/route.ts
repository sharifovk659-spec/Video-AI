import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { getEnv } from "@/lib/config/env";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { AppError } from "@/lib/errors/app-error";
import { validatePhotoUpload } from "@/lib/uploads/validate-photo";
import { validateVideoUpload } from "@/lib/uploads/validate-video";
import {
  deleteTemplateMedia,
  storeTemplateMedia,
} from "@/lib/uploads/template-media-storage";

export const dynamic = "force-dynamic";

/**
 * Admin media upload for template covers / preview videos.
 * On Vercel the bytes are stored in MySQL and served from /api/v1/media.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdminApiSession();
    const form = await request.formData();
    const kindRaw = String(form.get("kind") ?? "");
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "Missing file field");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const env = getEnv();

    if (kindRaw === "cover") {
      const validated = validatePhotoUpload(
        buffer,
        file.type,
        file.name,
        env.TEMPLATE_COVER_MAX_BYTES,
      );
      const stored = await storeTemplateMedia({
        kind: "cover",
        body: buffer,
        mimeType: validated.mimeType,
        extension: validated.extension,
      });
      return NextResponse.json({
        data: {
          kind: "cover",
          storageKey: stored.storageKey,
          url: stored.url,
          mimeType: validated.mimeType,
          sizeBytes: stored.sizeBytes,
        },
      });
    }

    if (kindRaw === "preview") {
      const validated = validateVideoUpload(
        buffer,
        file.type,
        file.name,
        env.TEMPLATE_PREVIEW_MAX_BYTES,
      );
      const stored = await storeTemplateMedia({
        kind: "preview",
        body: buffer,
        mimeType: validated.mimeType,
        extension: validated.extension,
      });
      return NextResponse.json({
        data: {
          kind: "preview",
          storageKey: stored.storageKey,
          url: stored.url,
          mimeType: validated.mimeType,
          sizeBytes: stored.sizeBytes,
        },
      });
    }

    throw new AppError(
      "VALIDATION_ERROR",
      "kind must be cover or preview",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminApiSession();
    const key = request.nextUrl.searchParams.get("key");
    if (!key) {
      throw new AppError("VALIDATION_ERROR", "Missing key");
    }
    await deleteTemplateMedia(key);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
