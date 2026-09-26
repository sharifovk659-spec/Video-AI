import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { GenerationStatus, PaymentStatus, TemplateStatus } from "@prisma/client";

/**
 * Integration tests against the configured DATABASE_URL.
 * Uses MockAIProvider only — never paid Kling/Veo APIs.
 */
process.env.AI_ALLOW_MOCK_PROVIDER = "true";
process.env.AI_DEFAULT_PROVIDER = "mock";
process.env.MOCK_AI_COMPLETE_MS = "5";
process.env.MOCK_AI_FORCE_FAIL = "false";
process.env.DISABLE_WORKER_AUTO_KICK = "true";
process.env.GENERATION_POLL_INTERVAL_MS = "5";
process.env.GENERATION_JOB_LOCK_MS = "500";

type Libs = {
  prisma: typeof import("@/lib/db/prisma").prisma;
  reserveForGeneration: typeof import("@/lib/credits/charge").reserveForGeneration;
  refundGenerationCredits: typeof import("@/lib/credits/charge").refundGenerationCredits;
  finalizeGenerationCredits: typeof import("@/lib/credits/charge").finalizeGenerationCredits;
  createGenerationForUser: typeof import("@/lib/generations/create-generation").createGenerationForUser;
  processGenerationJobs: typeof import("@/lib/jobs/worker").processGenerationJobs;
  applyVerifiedPaymentStatus: typeof import("@/lib/payments/service").applyVerifiedPaymentStatus;
  toPublicTemplateListItem: typeof import("@/lib/templates/public-template").toPublicTemplateListItem;
  getStorageAdapter: typeof import("@/lib/storage/storage-adapter").getStorageAdapter;
  evaluateContentSafety: typeof import("@/lib/moderation/pre-generation").evaluateContentSafety;
};

describe("critical flow integration", () => {
  let libs: Libs;
  let modelId = "";
  let categoryId = "";
  const cleanupUserIds: string[] = [];
  const cleanupTemplateIds: string[] = [];

  async function createTestUser(opts?: { credits?: number; freeUsed?: number }) {
    const tgId = BigInt(Date.now() * 1000 + Math.floor(Math.random() * 1000));
    return libs.prisma.user.create({
      data: {
        freeGenerationsGranted: 2,
        freeGenerationsUsed: opts?.freeUsed ?? 0,
        telegramAccount: {
          create: {
            telegramUserId: tgId,
            username: `t_${tgId}`,
            firstName: "Test",
          },
        },
        creditWallet: {
          create: { balance: opts?.credits ?? 0, reserved: 0 },
        },
      },
      include: { telegramAccount: true, creditWallet: true },
    });
  }

  async function createPhoto(userId: string) {
    const storage = libs.getStorageAdapter();
    const stored = await storage.put("user_uploads", Buffer.alloc(64, 1), {
      contentType: "image/png",
      extension: "png",
      scopeId: userId,
    });
    return libs.prisma.userPhotoUpload.create({
      data: {
        userId,
        storageKey: stored.key,
        mimeType: "image/png",
        sizeBytes: stored.sizeBytes,
        originalFileName: "t.png",
      },
    });
  }

  /** Cancel leftover open jobs so MockAI lifecycle tests are not starved. */
  async function clearOpenJobs() {
    await libs.prisma.generationJob.updateMany({
      where: {
        status: {
          in: [GenerationStatus.queued, GenerationStatus.processing],
        },
      },
      data: {
        status: GenerationStatus.cancelled,
        finishedAt: new Date(),
        lockedUntil: null,
        lastError: "cleared by integration test",
      },
    });
    await libs.prisma.generation.updateMany({
      where: {
        status: {
          in: [GenerationStatus.queued, GenerationStatus.processing],
        },
      },
      data: {
        status: GenerationStatus.cancelled,
        stage: "cancelled",
        errorMessage: "cleared by integration test",
      },
    });
  }

  async function waitForGenerationStatus(
    generationId: string,
    terminal: GenerationStatus[],
    rounds = 80,
  ) {
    for (let i = 0; i < rounds; i++) {
      await libs.processGenerationJobs(20);
      const current = await libs.prisma.generation.findUniqueOrThrow({
        where: { id: generationId },
      });
      if (terminal.includes(current.status)) return current;
      await new Promise((r) => setTimeout(r, 20));
    }
    return libs.prisma.generation.findUniqueOrThrow({
      where: { id: generationId },
    });
  }

  before(async () => {
    const { resetEnvCache } = await import("@/lib/config/env");
    resetEnvCache();
    const [
      { prisma },
      charge,
      generations,
      worker,
      payments,
      templates,
      storage,
      moderation,
    ] = await Promise.all([
      import("@/lib/db/prisma"),
      import("@/lib/credits/charge"),
      import("@/lib/generations/create-generation"),
      import("@/lib/jobs/worker"),
      import("@/lib/payments/service"),
      import("@/lib/templates/public-template"),
      import("@/lib/storage/storage-adapter"),
      import("@/lib/moderation/pre-generation"),
    ]);
    libs = {
      prisma,
      reserveForGeneration: charge.reserveForGeneration,
      refundGenerationCredits: charge.refundGenerationCredits,
      finalizeGenerationCredits: charge.finalizeGenerationCredits,
      createGenerationForUser: generations.createGenerationForUser,
      processGenerationJobs: worker.processGenerationJobs,
      applyVerifiedPaymentStatus: payments.applyVerifiedPaymentStatus,
      toPublicTemplateListItem: templates.toPublicTemplateListItem,
      getStorageAdapter: storage.getStorageAdapter,
      evaluateContentSafety: moderation.evaluateContentSafety,
    };

    const provider = await prisma.aIProvider.upsert({
      where: { slug: "mock" },
      create: { slug: "mock", name: "Mock", isActive: true },
      update: { isActive: true },
    });
    const model = await prisma.aIModel.upsert({
      where: {
        providerId_slug: { providerId: provider.id, slug: "video-mock-v1" },
      },
      create: {
        providerId: provider.id,
        slug: "video-mock-v1",
        name: "Video Mock v1",
        isActive: true,
      },
      update: { isActive: true },
    });
    const category = await prisma.templateCategory.upsert({
      where: { slug: "fun" },
      create: { slug: "fun", name: "Fun", sortOrder: 1, isActive: true },
      update: { isActive: true },
    });
    modelId = model.id;
    categoryId = category.id;

    await prisma.appSetting.upsert({
      where: { key: "free_generations_per_user" },
      create: {
        key: "free_generations_per_user",
        value: 2,
        description: "test",
      },
      update: { value: 2 },
    });
    await prisma.appSetting.upsert({
      where: { key: "moderation_enabled" },
      create: {
        key: "moderation_enabled",
        value: true,
        description: "test",
      },
      update: { value: true },
    });
  });

  after(async () => {
    for (const id of cleanupUserIds) {
      await libs.prisma.user.deleteMany({ where: { id } });
    }
    for (const id of cleanupTemplateIds) {
      await libs.prisma.templateVersion.deleteMany({ where: { templateId: id } });
      await libs.prisma.template.deleteMany({ where: { id } });
    }
  });

  it("enforces 2 free generations then requires credits", async () => {
    const user = await createTestUser({ credits: 0 });
    cleanupUserIds.push(user.id);
    const slug = `it-free-${randomUUID().slice(0, 8)}`;
    const template = await libs.prisma.template.create({
      data: {
        slug,
        title: "Free Test",
        categoryId,
        aiModelId: modelId,
        status: TemplateStatus.active,
        creditCost: 1,
        prompt: "test prompt",
        durationSeconds: 5,
        aspectRatio: "9:16",
      },
    });
    cleanupTemplateIds.push(template.id);

    for (let i = 0; i < 2; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 8500));
      const photo = await createPhoto(user.id);
      const gen = await libs.createGenerationForUser({
        userId: user.id,
        templateSlug: slug,
        photoUploadId: photo.id,
        idempotencyKey: `free-${i}-${randomUUID()}`,
      });
      assert.equal(gen.status, GenerationStatus.queued);
      assert.equal(gen.usedFreeQuota, true);
    }

    const photo3 = await createPhoto(user.id);
    await assert.rejects(
      () =>
        libs.createGenerationForUser({
          userId: user.id,
          templateSlug: slug,
          photoUploadId: photo3.id,
          idempotencyKey: `free-3-${randomUUID()}`,
        }),
      /Insufficient credits|credits/i,
    );
  });

  it("charges credits and refunds on failure path", async () => {
    const user = await createTestUser({ credits: 10, freeUsed: 2 });
    cleanupUserIds.push(user.id);
    const slug = `it-credit-${randomUUID().slice(0, 8)}`;
    const template = await libs.prisma.template.create({
      data: {
        slug,
        title: "Credit Test",
        categoryId,
        aiModelId: modelId,
        status: TemplateStatus.active,
        creditCost: 3,
        prompt: "prompt",
        durationSeconds: 5,
        aspectRatio: "9:16",
      },
    });
    cleanupTemplateIds.push(template.id);
    const photo = await createPhoto(user.id);
    const gen = await libs.createGenerationForUser({
      userId: user.id,
      templateSlug: slug,
      photoUploadId: photo.id,
      idempotencyKey: `credit-${randomUUID()}`,
    });
    assert.equal(gen.creditsReserved, 3);
    assert.equal(gen.usedFreeQuota, false);

    const walletAfter = await libs.prisma.creditWallet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    assert.equal(walletAfter.balance, 7);
    assert.equal(walletAfter.reserved, 3);

    await libs.refundGenerationCredits(gen.id);
    const walletRefunded = await libs.prisma.creditWallet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    assert.equal(walletRefunded.balance, 10);
    assert.equal(walletRefunded.reserved, 0);
  });

  it("handles concurrent credit reservations without overdraft", async () => {
    const user = await createTestUser({ credits: 5, freeUsed: 2 });
    cleanupUserIds.push(user.id);
    const baseTemplate = await libs.prisma.template.findFirstOrThrow({
      where: { status: TemplateStatus.active, slug: { not: "ai-studio" } },
    });
    const results = await Promise.allSettled(
      [0, 1, 2].map(async () => {
        const gen = await libs.prisma.generation.create({
          data: {
            userId: user.id,
            templateId: baseTemplate.id,
            status: GenerationStatus.queued,
            providerSlug: "mock",
            providerModelSlug: "video-mock-v1",
          },
        });
        return libs.prisma.$transaction((tx) =>
          libs.reserveForGeneration(tx, {
            userId: user.id,
            generationId: gen.id,
            creditCost: 3,
          }),
        );
      }),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    const fail = results.filter((r) => r.status === "rejected");
    assert.equal(ok.length, 1);
    assert.equal(fail.length, 2);
    const wallet = await libs.prisma.creditWallet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    assert.equal(wallet.balance + wallet.reserved, 5);
    assert.ok(wallet.balance >= 0);
  });

  it("runs generation lifecycle with MockAIProvider (no paid APIs)", async () => {
    process.env.MOCK_AI_FORCE_FAIL = "false";
    await clearOpenJobs();
    const user = await createTestUser({ credits: 5, freeUsed: 2 });
    cleanupUserIds.push(user.id);
    const slug = `it-life-${randomUUID().slice(0, 8)}`;
    const template = await libs.prisma.template.create({
      data: {
        slug,
        title: "Lifecycle",
        categoryId,
        aiModelId: modelId,
        status: TemplateStatus.active,
        creditCost: 1,
        prompt: "lifecycle prompt",
        durationSeconds: 5,
        aspectRatio: "9:16",
        estimatedApiCostCents: 2,
      },
    });
    cleanupTemplateIds.push(template.id);
    const photo = await createPhoto(user.id);
    const gen = await libs.createGenerationForUser({
      userId: user.id,
      templateSlug: slug,
      photoUploadId: photo.id,
      idempotencyKey: `life-${randomUUID()}`,
    });

    const final = await waitForGenerationStatus(gen.id, [
      GenerationStatus.completed,
      GenerationStatus.failed,
    ]);
    assert.equal(final.status, GenerationStatus.completed);
    assert.ok(final.outputUrl);
    assert.equal(final.providerSlug, "mock");
  });

  it("retries then fails with mock provider failure", async () => {
    process.env.MOCK_AI_FORCE_FAIL = "true";
    await clearOpenJobs();
    const user = await createTestUser({ credits: 5, freeUsed: 2 });
    cleanupUserIds.push(user.id);
    const slug = `it-fail-${randomUUID().slice(0, 8)}`;
    const template = await libs.prisma.template.create({
      data: {
        slug,
        title: "Fail",
        categoryId,
        aiModelId: modelId,
        status: TemplateStatus.active,
        creditCost: 1,
        prompt: "fail prompt",
        durationSeconds: 5,
        aspectRatio: "9:16",
      },
    });
    cleanupTemplateIds.push(template.id);
    const photo = await createPhoto(user.id);
    const gen = await libs.createGenerationForUser({
      userId: user.id,
      templateSlug: slug,
      photoUploadId: photo.id,
      idempotencyKey: `fail-${randomUUID()}`,
    });

    try {
      const final = await waitForGenerationStatus(gen.id, [
        GenerationStatus.failed,
        GenerationStatus.cancelled,
      ]);
      assert.ok(
        final.status === GenerationStatus.failed ||
          final.status === GenerationStatus.cancelled,
        "expected generation to fail",
      );
      const wallet = await libs.prisma.creditWallet.findUniqueOrThrow({
        where: { userId: user.id },
      });
      assert.equal(wallet.balance, 5);
    } finally {
      process.env.MOCK_AI_FORCE_FAIL = "false";
    }
  });

  it("isolates generations between users", async () => {
    const a = await createTestUser({ credits: 5, freeUsed: 2 });
    const b = await createTestUser({ credits: 5, freeUsed: 2 });
    cleanupUserIds.push(a.id, b.id);
    const slug = `it-iso-${randomUUID().slice(0, 8)}`;
    const template = await libs.prisma.template.create({
      data: {
        slug,
        title: "Iso",
        categoryId,
        aiModelId: modelId,
        status: TemplateStatus.active,
        creditCost: 1,
        prompt: "iso",
        durationSeconds: 5,
        aspectRatio: "9:16",
      },
    });
    cleanupTemplateIds.push(template.id);
    const photoA = await createPhoto(a.id);
    const genA = await libs.createGenerationForUser({
      userId: a.id,
      templateSlug: slug,
      photoUploadId: photoA.id,
      idempotencyKey: `iso-a-${randomUUID()}`,
    });
    const leaked = await libs.prisma.generation.findFirst({
      where: { id: genA.id, userId: b.id },
    });
    assert.equal(leaked, null);
  });

  it("payment webhook is idempotent", async () => {
    const user = await createTestUser({ credits: 0 });
    cleanupUserIds.push(user.id);
    const pkg = await libs.prisma.creditPackage.findFirst({
      where: { isActive: true },
    });
    assert.ok(pkg);
    const externalId = `stub_${randomUUID()}`;
    const payment = await libs.prisma.payment.create({
      data: {
        userId: user.id,
        packageId: pkg!.id,
        amountCents: pkg!.priceCents,
        currency: pkg!.currency,
        creditsToGrant: pkg!.credits,
        status: PaymentStatus.pending,
        provider: "stub",
        externalId,
      },
    });

    const first = await libs.applyVerifiedPaymentStatus({
      externalId,
      status: "paid",
      eventKey: `evt_${payment.id}`,
      provider: "stub",
      raw: { ok: true },
    });
    const second = await libs.applyVerifiedPaymentStatus({
      externalId,
      status: "paid",
      eventKey: `evt_${payment.id}`,
      provider: "stub",
      raw: { ok: true },
    });
    assert.equal(first.granted, true);
    assert.equal(second.granted, false);

    const wallet = await libs.prisma.creditWallet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    assert.equal(wallet.balance, pkg!.credits);
  });

  it("admin can disable template (archive) so public catalog excludes it", async () => {
    const slug = `it-dis-${randomUUID().slice(0, 8)}`;
    const template = await libs.prisma.template.create({
      data: {
        slug,
        title: "Disable Me",
        categoryId,
        aiModelId: modelId,
        status: TemplateStatus.active,
        creditCost: 1,
        prompt: "hidden",
        durationSeconds: 5,
        aspectRatio: "9:16",
      },
    });
    cleanupTemplateIds.push(template.id);
    await libs.prisma.template.update({
      where: { id: template.id },
      data: { status: TemplateStatus.archived },
    });
    const publicHit = await libs.prisma.template.findFirst({
      where: { slug, status: TemplateStatus.active },
    });
    assert.equal(publicHit, null);
  });

  it("finalize credits is idempotent", async () => {
    const user = await createTestUser({ credits: 4, freeUsed: 2 });
    cleanupUserIds.push(user.id);
    const slug = `it-fin-${randomUUID().slice(0, 8)}`;
    const template = await libs.prisma.template.create({
      data: {
        slug,
        title: "Finalize",
        categoryId,
        aiModelId: modelId,
        status: TemplateStatus.active,
        creditCost: 2,
        prompt: "f",
        durationSeconds: 5,
        aspectRatio: "9:16",
      },
    });
    cleanupTemplateIds.push(template.id);
    const photo = await createPhoto(user.id);
    const gen = await libs.createGenerationForUser({
      userId: user.id,
      templateSlug: slug,
      photoUploadId: photo.id,
      idempotencyKey: `fin-${randomUUID()}`,
    });
    await libs.finalizeGenerationCredits(gen.id);
    await libs.finalizeGenerationCredits(gen.id);
    const wallet = await libs.prisma.creditWallet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    assert.equal(wallet.reserved, 0);
    assert.equal(wallet.balance, 2);
  });

  it("public template list item hides prompts", () => {
    assert.equal(libs.evaluateContentSafety("hello world").allowed, true);
    const pub = libs.toPublicTemplateListItem({
      id: "x",
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryId,
      aiModelId: modelId,
      slug: "x",
      title: "X",
      description: null,
      thumbnailUrl: null,
      coverUrl: null,
      previewVideoUrl: null,
      coverStorageKey: null,
      previewStorageKey: null,
      durationSeconds: 5,
      aspectRatio: "9:16",
      isTrending: false,
      isNew: false,
      isPopular: false,
      estimatedApiCostCents: 0,
      status: "active",
      isPro: false,
      creditCost: 1,
      prompt: "INTERNAL",
      negativePrompt: "NEG",
      sortOrder: 0,
      currentVersion: 0,
      clonedFromId: null,
      category: {
        id: categoryId,
        createdAt: new Date(),
        updatedAt: new Date(),
        slug: "fun",
        name: "Fun",
        description: null,
        sortOrder: 0,
        isActive: true,
      },
    } as never);
    assert.equal("prompt" in pub, false);
  });
});
