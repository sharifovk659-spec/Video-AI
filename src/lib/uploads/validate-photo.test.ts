import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validatePhotoUpload } from "@/lib/uploads/validate-photo";
import { AppError } from "@/lib/errors/app-error";

const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);

describe("validatePhotoUpload", () => {
  it("accepts valid png", () => {
    const result = validatePhotoUpload(PNG_HEADER, "image/png", "photo.png", 1024);
    assert.equal(result.mimeType, "image/png");
    assert.equal(result.extension, "png");
  });

  it("rejects executable extension", () => {
    assert.throws(
      () => validatePhotoUpload(PNG_HEADER, "image/png", "bad.exe", 1024),
      (err: unknown) => err instanceof AppError,
    );
  });
});
