import { NextResponse } from "next/server";
import { TemplateStatus } from "@prisma/client";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import { toPublicTemplateListItem } from "@/lib/templates/public-template";
import { cacheGet, cacheSet } from "@/lib/cache/memory-cache";

export const dynamic = "force-dynamic";

const HOME_CACHE_KEY = "public:home:sections";
const HOME_CACHE_TTL_MS = 45_000;

const SECTIONS = [
  { key: "trending", title: "Trending", filter: { isTrending: true } },
  { key: "new", title: "New", filter: { isNew: true } },
  { key: "popular", title: "Popular", filter: { isPopular: true } },
  { key: "pro", title: "Pro", filter: { isPro: true } },
  { key: "animals", title: "Animals", filter: { categorySlug: "animals" } },
  { key: "cinematic", title: "Cinematic", filter: { categorySlug: "cinematic" } },
  {
    key: "transformation",
    title: "Transformation",
    filter: { categorySlug: "transformation" },
  },
  { key: "fun", title: "Fun", filter: { categorySlug: "fun" } },
] as const;

async function fetchSectionTemplates(
  filter: {
    isTrending?: boolean;
    isNew?: boolean;
    isPopular?: boolean;
    isPro?: boolean;
    categorySlug?: string;
  },
  take = 8,
) {
  return prisma.template.findMany({
    where: {
      status: TemplateStatus.active,
      slug: { not: "ai-studio" },
      ...(filter.isTrending ? { isTrending: true } : {}),
      ...(filter.isNew ? { isNew: true } : {}),
      ...(filter.isPopular ? { isPopular: true } : {}),
      ...(filter.isPro ? { isPro: true } : {}),
      ...(filter.categorySlug
        ? { category: { slug: filter.categorySlug, isActive: true } }
        : {}),
    },
    include: { category: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take,
  });
}

export async function GET() {
  try {
    const cached = cacheGet<{ sections: unknown[] }>(HOME_CACHE_KEY);
    if (cached) {
      return NextResponse.json(
        { data: cached, meta: { cache: "hit" } },
        {
          headers: {
            "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
            "X-Vidoo-Cache": "HIT",
          },
        },
      );
    }

    const sections = await Promise.all(
      SECTIONS.map(async (section) => ({
        key: section.key,
        title: section.title,
        templates: (await fetchSectionTemplates(section.filter)).map(
          toPublicTemplateListItem,
        ),
      })),
    );

    const payload = { sections };
    cacheSet(HOME_CACHE_KEY, payload, HOME_CACHE_TTL_MS);

    return NextResponse.json(
      { data: payload, meta: { cache: "miss" } },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
          "X-Vidoo-Cache": "MISS",
        },
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
