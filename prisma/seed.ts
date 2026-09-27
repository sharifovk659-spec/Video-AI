import { PrismaClient, TemplateStatus } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: "animals", name: "Животные", description: "Стили с животными", sortOrder: 10 },
  { slug: "cinematic", name: "Кино", description: "Кинематографичные кадры", sortOrder: 20 },
  {
    slug: "transformation",
    name: "Трансформация",
    description: "Превращения и морфинг",
    sortOrder: 30,
  },
  { slug: "fun", name: "Веселье", description: "Яркие эффекты", sortOrder: 40 },
  {
    slug: "studio",
    name: "Студия",
    description: "Свои промпты AI Студии",
    sortOrder: 90,
  },
];

const SETTINGS: Array<{
  key: string;
  value: unknown;
  description: string;
}> = [
  {
    key: "free_generations_per_user",
    value: 2,
    description: "Exact free generations granted to each new legitimate user",
  },
  {
    key: "maintenance_mode",
    value: false,
    description: "When true, block new generations",
  },
  {
    key: "default_currency",
    value: "USD",
    description: "ISO currency code for payments",
  },
  {
    key: "studio_credit_cost",
    value: 5,
    description: "Credits charged per AI Studio generation",
  },
  {
    key: "studio_min_credits",
    value: 1,
    description: "Minimum credit balance to unlock AI Studio (or paid history)",
  },
  {
    key: "moderation_enabled",
    value: true,
    description: "Run pre-generation content safety / deepfake checks",
  },
  {
    key: "moderation_webhook_url",
    value: "",
    description: "Optional external moderation webhook (empty = local rules only)",
  },
  {
    key: "retention_uploads_days",
    value: 30,
    description: "Days to retain unused user uploads before cleanup",
  },
  {
    key: "retention_outputs_days",
    value: 90,
    description: "Days to retain generated video objects",
  },
  {
    key: "retention_account_inactive_days",
    value: 365,
    description: "Policy reference for inactive account retention",
  },
];

async function main() {
  for (const category of CATEGORIES) {
    await prisma.templateCategory.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
  }

  for (const setting of SETTINGS) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        value: setting.value as object,
        description: setting.description,
      },
      update: {
        value: setting.value as object,
        description: setting.description,
      },
    });
  }

  const provider = await prisma.aIProvider.upsert({
    where: { slug: "mock" },
    create: { slug: "mock", name: "Mock Provider (local/test)", isActive: true },
    update: { isActive: true },
  });

  await prisma.aIProvider.upsert({
    where: { slug: "kling" },
    create: { slug: "kling", name: "Kling", isActive: true },
    update: {},
  });

  await prisma.aIProvider.upsert({
    where: { slug: "veo" },
    create: { slug: "veo", name: "Veo", isActive: true },
    update: {},
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

  const categories = await prisma.templateCategory.findMany();
  const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  const samples = [
    {
      slug: "neon-predator",
      title: "Неоновый хищник",
      description: "Тёмный неон и хищный силуэт. Оригинальная обложка Vidoo.",
      categorySlug: "animals",
      cover: "/covers/neon.svg",
      isTrending: true,
      isNew: true,
      isPro: true,
      isPopular: true,
      creditCost: 5,
    },
    {
      slug: "golden-hour-portrait",
      title: "Золотой час",
      description: "Тёплый портретный свет. Оригинальная обложка Vidoo.",
      categorySlug: "cinematic",
      cover: "/covers/gold.svg",
      isTrending: true,
      isNew: false,
      isPro: false,
      isPopular: true,
      creditCost: 2,
    },
    {
      slug: "cyber-morph",
      title: "Кибер-морф",
      description: "Цифровая трансформация лица. Оригинальная обложка Vidoo.",
      categorySlug: "transformation",
      cover: "/covers/cyber.svg",
      isTrending: false,
      isNew: true,
      isPro: true,
      isPopular: false,
      creditCost: 4,
    },
    {
      slug: "party-loop",
      title: "Вечеринка",
      description: "Яркий клубный ритм. Оригинальная обложка Vidoo.",
      categorySlug: "fun",
      cover: "/covers/party.svg",
      isTrending: true,
      isNew: false,
      isPro: false,
      isPopular: true,
      creditCost: 1,
    },
    {
      slug: "aurora-drift",
      title: "Северное сияние",
      description: "Медленный дрейф света. Оригинальная обложка Vidoo.",
      categorySlug: "cinematic",
      cover: "/covers/aurora.svg",
      isTrending: true,
      isNew: true,
      isPro: false,
      isPopular: true,
      creditCost: 3,
    },
    {
      slug: "silk-motion",
      title: "Шёлковое движение",
      description: "Мягкий морфинг ткани и света. Оригинальная обложка Vidoo.",
      categorySlug: "transformation",
      cover: "/covers/silk.svg",
      isTrending: false,
      isNew: true,
      isPro: false,
      isPopular: false,
      creditCost: 3,
    },
    {
      slug: "ocean-glow",
      title: "Океанский свет",
      description: "Глубокая вода и блики. Оригинальная обложка Vidoo.",
      categorySlug: "cinematic",
      cover: "/covers/ocean.svg",
      isTrending: false,
      isNew: false,
      isPro: true,
      isPopular: true,
      creditCost: 4,
    },
    {
      slug: "velvet-night",
      title: "Бархатная ночь",
      description: "Ночной портрет с фиолетовым акцентом. Оригинальная обложка Vidoo.",
      categorySlug: "fun",
      cover: "/covers/velvet.svg",
      isTrending: true,
      isNew: false,
      isPro: false,
      isPopular: false,
      creditCost: 2,
    },
  ] as const;

  for (const [index, sample] of samples.entries()) {
    const categoryId = bySlug[sample.categorySlug];
    if (!categoryId) continue;

    await prisma.template.upsert({
      where: { slug: sample.slug },
      create: {
        slug: sample.slug,
        title: sample.title,
        description: sample.description,
        categoryId,
        aiModelId: model.id,
        status: TemplateStatus.active,
        isPro: sample.isPro,
        isTrending: sample.isTrending,
        isNew: sample.isNew,
        isPopular: sample.isPopular,
        creditCost: sample.creditCost,
        sortOrder: index,
        aspectRatio: "9:16",
        durationSeconds: 8,
        estimatedApiCostCents: 15,
        prompt: "INTERNAL PROMPT — admin only",
        negativePrompt: "blurry, low quality",
        coverUrl: sample.cover,
        previewVideoUrl: null,
      },
      update: {
        title: sample.title,
        description: sample.description,
        status: TemplateStatus.active,
        isPro: sample.isPro,
        isTrending: sample.isTrending,
        isNew: sample.isNew,
        isPopular: sample.isPopular,
        creditCost: sample.creditCost,
        sortOrder: index,
        coverUrl: sample.cover,
        durationSeconds: 8,
        aspectRatio: "9:16",
      },
    });
  }

  const studioCategoryId = bySlug.studio ?? bySlug.fun;
  if (studioCategoryId) {
    await prisma.template.upsert({
      where: { slug: "ai-studio" },
      create: {
        slug: "ai-studio",
        title: "AI Studio",
        description: "Custom prompt studio generations (hidden from catalog).",
        categoryId: studioCategoryId,
        aiModelId: model.id,
        status: TemplateStatus.active,
        isPro: true,
        isTrending: false,
        isNew: false,
        isPopular: false,
        creditCost: 5,
        sortOrder: 9999,
        aspectRatio: "9:16",
        durationSeconds: 8,
        estimatedApiCostCents: 25,
        prompt:
          "Create a high-quality short video from the user photo.\nUser direction: {{user_prompt}}",
        negativePrompt: "blurry, low quality, watermark, text overlay",
        coverUrl: null,
        previewVideoUrl: null,
      },
      update: {
        title: "AI Studio",
        status: TemplateStatus.active,
        isPro: true,
        creditCost: 5,
        prompt:
          "Create a high-quality short video from the user photo.\nUser direction: {{user_prompt}}",
        aiModelId: model.id,
        categoryId: studioCategoryId,
      },
    });
  }

  const packages = [
    {
      slug: "starter",
      name: "Starter",
      credits: 20,
      priceCents: 299,
      currency: "USD",
      isActive: true,
      isPopular: false,
      sortOrder: 10,
      benefits: "Great for trying a few premium templates.",
    },
    {
      slug: "creator",
      name: "Creator",
      credits: 80,
      priceCents: 999,
      currency: "USD",
      isActive: true,
      isPopular: true,
      sortOrder: 20,
      benefits: "Best value for regular creators.",
    },
    {
      slug: "studio",
      name: "Studio",
      credits: 250,
      priceCents: 2499,
      currency: "USD",
      isActive: true,
      isPopular: false,
      sortOrder: 30,
      benefits: "High volume pack for teams and power users.",
    },
  ] as const;

  for (const pkg of packages) {
    await prisma.creditPackage.upsert({
      where: { slug: pkg.slug },
      create: pkg,
      update: {
        name: pkg.name,
        credits: pkg.credits,
        priceCents: pkg.priceCents,
        currency: pkg.currency,
        isActive: pkg.isActive,
        isPopular: pkg.isPopular,
        sortOrder: pkg.sortOrder,
        benefits: pkg.benefits,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
