import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { serializeAdminUserListItem } from "@/lib/admin/serialize-admin-user";

describe("serializeAdminUserListItem", () => {
  it("serializes BigInt telegram id as string", () => {
    const item = serializeAdminUserListItem({
      id: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      freeGenerationsUsed: 1,
      freeGenerationsGranted: 5,
      freeQuotaBlocked: false,
      abuseScore: 0,
      signupFingerprint: null,
      lastFreeGenerationAt: null,
      isBlocked: false,
      telegramAccount: {
        id: "tg-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
        telegramUserId: BigInt("123456789"),
        username: "komron",
        firstName: "Komron",
        lastName: null,
        languageCode: null,
        isPremium: false,
        photoUrl: null,
        lastActiveAt: new Date(),
      },
      creditWallet: null,
    });

    assert.equal(item.telegramAccount?.telegramUserId, "123456789");
    assert.equal(JSON.stringify(item).includes("123456789"), true);
  });
});
