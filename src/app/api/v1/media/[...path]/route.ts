import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { getStorageAdapter } from "@/lib/storage/storage-adapter";
import {
  createObjectAccessToken,
  verifyObjectAccessToken,
  verifyUploadAccessToken,
} from "@/lib/uploads/signed-access";
import { getSessionFromCookies } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ path: string[] }> };

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

/**
 * Serves object-storage media by key path.
 * Public kinds (template covers/previews) are open + cacheable.
 * Private kinds require a key-bound signed token or owning session.
 * Never streams private user media into admin analytics responses.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { path: segments } = await params;
    if (!segments?.length) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Not found" } },
        { status: 404 },
      );
    }

    const key = segments.map(decodeURIComponent).join("/");
    const storage = getStorageAdapter();
    const safeKey = storage.resolveSafeKey(key);

    if (!storage.isPublicKey(safeKey)) {
      let allowed = false;
      const token = request.nextUrl.searchParams.get("token");

      if (token) {
        const objectClaims = verifyObjectAccessToken(token);
        if (objectClaims && objectClaims.key === safeKey) {
          allowed = true;
        } else {
          const uploadClaims = verifyUploadAccessToken(token);
          if (uploadClaims) {
            const upload = await prisma.userPhotoUpload.findFirst({
              where: {
                id: uploadClaims.uploadId,
                userId: uploadClaims.userId,
                storageKey: safeKey,
              },
              select: { id: true },
            });
            allowed = Boolean(upload);
          }
        }
      }

      if (!allowed) {
        const session = await getSessionFromCookies();
        if (session) {
          if (safeKey.startsWith(`user_uploads/${session.userId}/`)) {
            allowed = true;
          } else if (safeKey.startsWith("generated_videos/")) {
            const genId = safeKey.split("/")[1];
            const owned = await prisma.generation.findFirst({
              where: { id: genId, userId: session.userId },
              select: { id: true },
            });
            allowed = Boolean(owned);
          }
        }
      }

      if (!allowed) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Access denied" } },
          { status: 403 },
        );
      }
    }

    const body = await storage.readObject(safeKey);
    const ext = safeKey.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": storage.isPublicKey(safeKey)
          ? "public, max-age=86400, stale-while-revalidate=604800"
          : "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export function signedMediaUrl(key: string, userId: string) {
  const token = createObjectAccessToken(key, userId);
  return `/api/v1/media/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}?token=${encodeURIComponent(token)}`;
}
