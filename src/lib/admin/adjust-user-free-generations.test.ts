import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { PrismaClient } from "@prisma/client";
import { adjustUserFreeGenerations } from "@/lib/admin/adjust-user-free-generations";

const prisma = new PrismaClient();
const hasDb = Boolean(process.env.DATABASE_URL?.startsWith("mysql://"));

describe("adjustUserFreeGenerations", { skip: !hasDb }, () => {
  let userId: string;
  let adminId: string;

  beforeEach(async () => {
    const admin = await prisma.user.create({
      data: {
        freeGenerationsGranted: 0,
        freeGenerationsUsed: 0,
        telegramAccount: {
          create: {
            telegramUserId: BigInt(Date.now()),
            username: `admin_${Date.now()}`,
            firstName: "Admin",
          },
        },
      },
    });
    adminId = admin.id;

    const user = await prisma.user.create({
      data: {
        freeGenerationsGranted: 2,
        freeGenerationsUsed: 2,
        telegramAccount: {
          create: {
            telegramUserId: BigInt(Date.now() + 1),
            username: `user_${Date.now()}`,
            firstName: "Komron",
          },
        },
      },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [userId, adminId] } },
    });
  });

  it("increases granted free generations without touching credits", async () => {
    const before = await prisma.creditWallet.findUnique({
      where: { userId },
    });
    assert.equal(before, null);

    const result = await adjustUserFreeGenerations({
      userId,
      delta: 10,
      adminActorId: adminId,
      note: "Promo bonus",
    });

    assert.equal(result.freeGenerationsGranted, 12);
    assert.equal(result.freeGenerationsUsed, 2);
    assert.equal(result.freeGenerationsRemaining, 10);

    const wallet = await prisma.creditWallet.findUnique({ where: { userId } });
    assert.equal(wallet, null);
  });

  it("decreases granted but not below zero", async () => {
    const result = await adjustUserFreeGenerations({
      userId,
      delta: -5,
      adminActorId: adminId,
      note: "Correction",
    });
    assert.equal(result.freeGenerationsGranted, 0);
    assert.equal(result.freeGenerationsRemaining, 0);
  });
});
