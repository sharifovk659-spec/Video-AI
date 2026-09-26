import { AppError } from "@/lib/errors/app-error";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

const SIGNATURES: Array<{ mime: string; check: (b: Buffer) => boolean }> = [
  { mime: "image/jpeg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    check: (b) =>
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47,
  },
  {
    mime: "image/webp",
    check: (b) =>
      b.length > 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
];

export type ValidatedPhoto = {
  mimeType: string;
  extension: string;
};

export function validatePhotoUpload(
  buffer: Buffer,
  declaredMime: string,
  fileName: string,
  maxBytes: number,
): ValidatedPhoto {
  if (buffer.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Empty file");
  }
  if (buffer.length > maxBytes) {
    throw new AppError("VALIDATION_ERROR", "File exceeds maximum size");
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(ext)) {
    throw new AppError("VALIDATION_ERROR", "Unsupported file extension");
  }

  const mime = declaredMime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_MIME.has(mime)) {
    throw new AppError("VALIDATION_ERROR", "Unsupported MIME type");
  }

  const signature = SIGNATURES.find((s) => s.check(buffer));
  if (!signature || signature.mime !== mime) {
    throw new AppError("VALIDATION_ERROR", "File content does not match type");
  }

  const normalizedExt = ext === "jpeg" ? "jpg" : ext;

  return { mimeType: mime, extension: normalizedExt };
}
