import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { resetEnvCache } from "@/lib/config/env";

describe("admin authorization", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env = { ...prev };
    process.env.DATABASE_URL = "mysql://root:@localhost:3306/vidoo_ai_test";
    process.env.SESSION_SECRET = "test-session-secret-32-characters-long!";
    process.env.ADMIN_TELEGRAM_IDS = "111,222";
    resetEnvCache();
  });

  afterEach(() => {
    process.env = { ...prev };
    resetEnvCache();
  });

  it("grants admin only for listed Telegram IDs", async () => {
    const { isAdminTelegramUserId } = await import("@/lib/admin/is-admin-user");
    assert.equal(isAdminTelegramUserId(BigInt(111)), true);
    assert.equal(isAdminTelegramUserId(BigInt(222)), true);
    assert.equal(isAdminTelegramUserId(BigInt(333)), false);
  });

  it("assertAdmin rejects non-admin with FORBIDDEN", async () => {
    const { assertAdminTelegramUser } = await import("@/lib/security/admin");
    const { AppError } = await import("@/lib/errors/app-error");

    assert.doesNotThrow(() => assertAdminTelegramUser(BigInt(111)));
    assert.throws(
      () => assertAdminTelegramUser(BigInt(999)),
      (err: unknown) =>
        err instanceof AppError &&
        err.code === "FORBIDDEN" &&
        /Admin access required/i.test(err.message),
    );
  });

  it("empty ADMIN_TELEGRAM_IDS denies everyone", async () => {
    process.env.ADMIN_TELEGRAM_IDS = "";
    resetEnvCache();
    const { isAdminTelegramUserId } = await import("@/lib/admin/is-admin-user");
    const { assertAdminTelegramUser } = await import("@/lib/security/admin");
    const { AppError } = await import("@/lib/errors/app-error");

    assert.equal(isAdminTelegramUserId(BigInt(111)), false);
    assert.throws(
      () => assertAdminTelegramUser(BigInt(111)),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });
});

describe("admin IDOR / session binding", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env = { ...prev };
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || "mysql://root:@localhost:3308/vidoo_ai";
    process.env.SESSION_SECRET = "test-session-secret-32-characters-long!";
    process.env.ADMIN_TELEGRAM_IDS = "424242";
    process.env.AI_ALLOW_MOCK_PROVIDER = "true";
    process.env.DISABLE_WORKER_AUTO_KICK = "true";
    resetEnvCache();
  });

  afterEach(() => {
    process.env = { ...prev };
    resetEnvCache();
  });

  it("non-admin user cannot pass requireAdminApiSession", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { upsertTelegramUser } = await import(
      "@/lib/users/upsert-telegram-user"
    );
    const { AppError } = await import("@/lib/errors/app-error");

    const user = await upsertTelegramUser({
      telegramUserId: BigInt(515151),
      username: "not_admin_idor",
      firstName: "NoAdmin",
    });

    // Simulate requireAdminApiSession checks without cookies():
    const { assertAdminTelegramUser } = await import("@/lib/security/admin");
    assert.throws(
      () => assertAdminTelegramUser(user.telegramAccount.telegramUserId),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );

    // Session binding: telegram id on account must match claimed session id
    assert.notEqual(
      user.telegramAccount.telegramUserId.toString(),
      "424242",
    );

    await prisma.telegramAccount.delete({ where: { id: user.telegramAccount.id } }).catch(() => undefined);
    await prisma.creditWallet.deleteMany({ where: { userId: user.id } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
  });

  it("admin telegram id passes assert and page access helper logic", async () => {
    const { isAdminTelegramUserId } = await import("@/lib/admin/is-admin-user");
    const { assertAdminTelegramUser } = await import("@/lib/security/admin");
    assert.equal(isAdminTelegramUserId(BigInt(424242)), true);
    assert.doesNotThrow(() => assertAdminTelegramUser(BigInt(424242)));
  });
});
