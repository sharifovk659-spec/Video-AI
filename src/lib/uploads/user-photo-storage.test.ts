import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  DB_PHOTO_KEY_PREFIX,
  isDatabasePhotoKey,
  readUserPhotoBytes,
  shouldStoreUserPhotosInDatabase,
  storeUserPhoto,
} from "@/lib/uploads/user-photo-storage";

describe("user photo storage", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("uses database storage on Vercel", () => {
    process.env.VERCEL = "1";
    assert.equal(shouldStoreUserPhotosInDatabase(), true);
  });

  it("stores bytes inline with db key prefix", async () => {
    process.env.VERCEL = "1";
    const body = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    const stored = await storeUserPhoto(
      "user-uuid",
      body,
      "image/jpeg",
      "jpg",
    );
    assert.ok(stored.storageKey.startsWith(DB_PHOTO_KEY_PREFIX));
    assert.equal(stored.dataBytes?.length, 4);
    const read = await readUserPhotoBytes({
      storageKey: stored.storageKey,
      dataBytes: stored.dataBytes
        ? new Uint8Array(stored.dataBytes)
        : null,
    });
    assert.deepEqual(read, body);
    assert.equal(isDatabasePhotoKey(stored.storageKey), true);
  });
});
