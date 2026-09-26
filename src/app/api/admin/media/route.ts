import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { getEnv } from "@/lib/config/env";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { AppError } from "@/lib/errors/app-error";
import { getStorageAdapter } from "@/lib/storage/storage-adapter";
import { validatePhotoUpload } from "@/lib/uploads/validate-photo";
import { validateVideoUpload } from "@/lib/uploads/validate-video";

export const dynamic = "force-dynamic";

/**
 * Admin media upload for template covers / preview videos.
 * Stored via StorageAdapter under dedicated namespaces (not in DB as blobs).
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdminApiSession();
    const form = await request.formData();
    const kindRaw = String(form.get("kind") ?? "");
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "Missing file field");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorageAdapter();
    const env = getEnv();

    if (kindRaw === "cover") {
      const validated = validatePhotoUpload(
        buffer,
        file.type,
        file.name,
        env.TEMPLATE_COVER_MAX_BYTES,
      );
      const stored = await storage.put("template_covers", buffer, {
        contentType: validated.mimeType,
        extension: validated.extension,
        scopeId: user.id,
      });
      return NextResponse.json({
        data: {
          kind: "cover",
          storageKey: stored.key,
          url: stored.publicUrl,
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
      const stored = await storage.put("template_previews", buffer, {
        contentType: validated.mimeType,
        extension: validated.extension,
        scopeId: user.id,
      });
      return NextResponse.json({
        data: {
          kind: "preview",
          storageKey: stored.key,
          url: stored.publicUrl,
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
