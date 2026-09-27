import { AppError } from "@/lib/errors/app-error";

const ALLOWED_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const ALLOWED_EXT = new Set(["mp4", "webm", "mov"]);

function looksLikeMp4(b: Buffer): boolean {
  // ISO BMFF: size + 'ftyp' at offset 4
  return (
    b.length > 12 &&
    b.toString("ascii", 4, 8) === "ftyp"
  );
}

function looksLikeWebm(b: Buffer): boolean {
  // EBML header
  return (
    b.length > 4 &&
    b[0] === 0x1a &&
    b[1] === 0x45 &&
    b[2] === 0xdf &&
    b[3] === 0xa3
  );
}

export type ValidatedVideo = {
  mimeType: string;
  extension: string;
};

export function validateVideoUpload(
  buffer: Buffer,
  declaredMime: string,
  fileName: string,
  maxBytes: number,
): ValidatedVideo {
  if (buffer.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Empty file");
  }
  if (buffer.length > maxBytes) {
    throw new AppError("VALIDATION_ERROR", "File exceeds maximum size");
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(ext)) {
    throw new AppError("VALIDATION_ERROR", "Unsupported video extension");
  }

  let mime = declaredMime.split(";")[0]?.trim().toLowerCase() ?? "";
  const isMp4 = looksLikeMp4(buffer);
  const isWebm = looksLikeWebm(buffer);
  if (!isMp4 && !isWebm) {
    throw new AppError("VALIDATION_ERROR", "File content does not match type");
  }
  if (!mime) {
    mime = isWebm ? "video/webm" : "video/mp4";
  } else if (!ALLOWED_MIME.has(mime)) {
    throw new AppError("VALIDATION_ERROR", "Unsupported video MIME type");
  } else if (mime === "video/webm" && !isWebm) {
    throw new AppError("VALIDATION_ERROR", "File content does not match type");
  } else if ((mime === "video/mp4" || mime === "video/quicktime") && !isMp4) {
    throw new AppError("VALIDATION_ERROR", "File content does not match type");
  }

  return { mimeType: mime, extension: ext === "mov" ? "mov" : ext };
}
