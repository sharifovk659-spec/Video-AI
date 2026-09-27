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

  const mockProvider = await prisma.aIProvider.upsert({
    where: { slug: "mock" },
    create: { slug: "mock", name: "Mock Provider (local/test)", isActive: true },
    update: { isActive: true },
  });

  const klingProvider = await prisma.aIProvider.upsert({
    where: { slug: "kling" },
    create: { slug: "kling", name: "Kling (PiAPI)", isActive: true },
    update: { isActive: true, name: "Kling (PiAPI)" },
  });

  await prisma.aIProvider.upsert({
    where: { slug: "veo" },
    create: { slug: "veo", name: "Veo", isActive: true },
    update: { isActive: true },
  });

  const mockModel = await prisma.aIModel.upsert({
    where: {
      providerId_slug: { providerId: mockProvider.id, slug: "video-mock-v1" },
    },
    create: {
      providerId: mockProvider.id,
      slug: "video-mock-v1",
      name: "Video Mock v1",
      isActive: true,
    },
    update: { isActive: true },
  });

  const klingModel = await prisma.aIModel.upsert({
    where: {
      providerId_slug: {
        providerId: klingProvider.id,
        slug: "video-kling-2.5-std",
      },
    },
    create: {
      providerId: klingProvider.id,
      slug: "video-kling-2.5-std",
      name: "Kling 2.5 image-to-video (std)",
      isActive: true,
    },
    update: { isActive: true, name: "Kling 2.5 image-to-video (std)" },
  });

  const useProductionCatalog = process.env.NODE_ENV === "production";
  const catalogModel = useProductionCatalog ? klingModel : mockModel;

  if (useProductionCatalog) {
    await prisma.aIProvider.update({
      where: { slug: "mock" },
      data: { isActive: false },
    });
  }

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
        aiModelId: catalogModel.id,
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
        aiModelId: catalogModel.id,
      },
    });
  }

  const NEGATIVE =
    "different person, identity change, face swap, extra face, deformed face, extra limbs, cartoon, anime, watermark, text, logo, blurry, low quality, plastic skin";

  const klingTemplates = [
    {
      slug: "lion-transformation",
      title: "Lion Transformation",
      description: "Кинематографичное превращение в льва. Лицо остаётся вашим.",
      categorySlug: "animals",
      cover: "/covers/lion.svg",
      isTrending: true,
      isNew: true,
      creditCost: 4,
      sortOrder: 1,
      prompt:
        "Image-to-video of the exact same person in the photo. Lock facial identity: same face shape, eyes, age, and skin tone. A photoreal lion transformation unfolds around them — a natural golden mane of fur and light grows from the hair and shoulders, amber rim light in the eyes, powerful but graceful posture. The person never becomes someone else. Cinematic 35mm look, slow push-in, realistic motion, shallow depth of field.",
    },
    {
      slug: "eagle-transformation",
      title: "Eagle Transformation",
      description: "Ветер и перья света. Лицо человека сохраняется.",
      categorySlug: "animals",
      cover: "/covers/eagle.svg",
      isTrending: true,
      isNew: true,
      creditCost: 4,
      sortOrder: 2,
      prompt:
        "Image-to-video of the same person. Preserve the face exactly. Wind lifts the hair as realistic feather-like light forms at the shoulders, suggesting an eagle spirit without replacing the human. Golden-hour sky, photoreal skin, slow majestic camera drift, film grain, natural blink and breath. Identity must stay recognizable throughout.",
    },
    {
      slug: "shark-transformation",
      title: "Shark Transformation",
      description: "Глубокая вода и свет каустики. Лицо не меняется.",
      categorySlug: "animals",
      cover: "/covers/shark.svg",
      isTrending: false,
      isNew: true,
      creditCost: 4,
      sortOrder: 3,
      prompt:
        "Image-to-video of the same person underwater. Keep facial identity identical. Cool caustic light moves across the real face, hair drifts naturally, and a realistic shark silhouette glides in the deep blue behind them without covering or replacing the face. Photoreal skin, slow drift, anamorphic bokeh, cinematic color grade.",
    },
    {
      slug: "cinematic-superhero",
      title: "Cinematic Superhero",
      description: "Героический кадр с тем же лицом и реалистичной тканью.",
      categorySlug: "cinematic",
      cover: "/covers/hero.svg",
      isTrending: true,
      isNew: true,
      creditCost: 5,
      sortOrder: 4,
      prompt:
        "Cinematic superhero reveal of the same person in the photo. Do not change the face, age, or identity. A tailored dark suit and cape form with realistic fabric physics, city lights, strong rim light, slow heroic camera rise. Photoreal skin texture, natural confident motion, film-still quality, no cartoon costume, no different actor.",
    },
    {
      slug: "fire-transformation",
      title: "Fire Transformation",
      description: "Контролируемый огонь вокруг человека. Лицо в безопасности и узнаваемо.",
      categorySlug: "transformation",
      cover: "/covers/fire.svg",
      isTrending: false,
      isNew: true,
      creditCost: 4,
      sortOrder: 5,
      prompt:
        "Image-to-video of the same person. Preserve the face exactly and keep skin unburned. Controlled cinematic fire and embers orbit the body and shoulders, warm backlight on the real face, slow-motion sparks, photoreal skin highlights. The person stays human and recognizable — flames never replace the face or turn them into a creature.",
    },
  ] as const;

  for (const sample of klingTemplates) {
    const categoryId = bySlug[sample.categorySlug];
    if (!categoryId) continue;
    await prisma.template.upsert({
      where: { slug: sample.slug },
      create: {
        slug: sample.slug,
        title: sample.title,
        description: sample.description,
        categoryId,
        aiModelId: klingModel.id,
        status: TemplateStatus.active,
        isPro: false,
        isTrending: sample.isTrending,
        isNew: sample.isNew,
        isPopular: sample.isTrending,
        creditCost: sample.creditCost,
        sortOrder: sample.sortOrder,
        aspectRatio: "9:16",
        durationSeconds: 5,
        estimatedApiCostCents: 20,
        prompt: sample.prompt,
        negativePrompt: NEGATIVE,
        coverUrl: sample.cover,
        thumbnailUrl: sample.cover,
        previewVideoUrl: null,
      },
      update: {
        title: sample.title,
        description: sample.description,
        categoryId,
        aiModelId: klingModel.id,
        status: TemplateStatus.active,
        isTrending: sample.isTrending,
        isNew: sample.isNew,
        creditCost: sample.creditCost,
        sortOrder: sample.sortOrder,
        aspectRatio: "9:16",
        durationSeconds: 5,
        prompt: sample.prompt,
        negativePrompt: NEGATIVE,
        coverUrl: sample.cover,
        thumbnailUrl: sample.cover,
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
        aiModelId: catalogModel.id,
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
        aiModelId: catalogModel.id,
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
