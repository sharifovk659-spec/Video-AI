import { NextRequest, NextResponse } from "next/server";
import { TemplateStatus, Prisma } from "@prisma/client";
import { paginationArgs, paginatedMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import { toPublicTemplateListItem } from "@/lib/templates/public-template";
import { getSessionFromCookies } from "@/lib/auth/session";
import { cacheGet, cacheSet } from "@/lib/cache/memory-cache";

export const dynamic = "force-dynamic";

const TEMPLATE_LIST_TTL_MS = 30_000;

function sanitizeFulltextQuery(raw: string): string {
  return raw
    .replace(/[+\-><()~*"@]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 8)
    .map((t) => `+${t}*`)
    .join(" ");
}

async function searchTemplateIds(search: string): Promise<string[] | null> {
  const ft = sanitizeFulltextQuery(search);
  if (ft) {
    try {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM templates
        WHERE MATCH(title, description) AGAINST (${ft} IN BOOLEAN MODE)
          AND status = 'active'
          AND slug <> 'ai-studio'
        LIMIT 200
      `;
      if (rows.length > 0) return rows.map((r) => r.id);
    } catch {
      // Fall through to LIKE search if FULLTEXT unavailable
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = paginationArgs(searchParams);
    const search = searchParams.get("q")?.trim();
    const categorySlug = searchParams.get("category")?.trim();
    const trending = searchParams.get("trending") === "1";
    const isNew = searchParams.get("new") === "1";
    const popular = searchParams.get("popular") === "1";
    const pro = searchParams.get("pro") === "1";
    const favoritesOnly = searchParams.get("favorites") === "1";

    const session = favoritesOnly ? await getSessionFromCookies() : null;
    if (favoritesOnly && !session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    const cacheable =
      !favoritesOnly && !search && pageSize <= 48;
    const cacheKey = cacheable
      ? `public:templates:${page}:${pageSize}:${categorySlug ?? ""}:${trending}:${isNew}:${popular}:${pro}`
      : null;

    if (cacheKey) {
      const cached = cacheGet<{ data: unknown; meta: unknown }>(cacheKey);
      if (cached) {
        // Still attach favorite flags for authenticated users
        const auth = await getSessionFromCookies();
        if (!auth) {
          return NextResponse.json(cached, {
            headers: {
              "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
              "X-Vidoo-Cache": "HIT",
            },
          });
        }
      }
    }

    const and: Prisma.TemplateWhereInput[] = [
      { status: TemplateStatus.active },
      { slug: { not: "ai-studio" } },
    ];

    if (search) {
      const ftIds = await searchTemplateIds(search);
      if (ftIds) {
        and.push({ id: { in: ftIds } });
      } else {
        and.push({
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
          ],
        });
      }
    }
    if (categorySlug) {
      and.push({ category: { slug: categorySlug, isActive: true } });
    }
    if (trending) and.push({ isTrending: true });
    if (isNew) and.push({ isNew: true });
    if (popular) and.push({ isPopular: true });
    if (pro) and.push({ isPro: true });
    if (favoritesOnly && session) {
      and.push({ favorites: { some: { userId: session.userId } } });
    }

    const where: Prisma.TemplateWhereInput = { AND: and };

    const [total, rows] = await Promise.all([
      prisma.template.count({ where }),
      prisma.template.findMany({
        where,
        include: { category: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    let favoriteIds = new Set<string>();
    const auth = session ?? (await getSessionFromCookies());
    if (auth) {
      const favs = await prisma.favorite.findMany({
        where: {
          userId: auth.userId,
          templateId: { in: rows.map((r) => r.id) },
        },
        select: { templateId: true },
      });
      favoriteIds = new Set(favs.map((f) => f.templateId));
    }

    const payload = {
      data: rows.map((row) => ({
        ...toPublicTemplateListItem(row),
        isFavorite: favoriteIds.has(row.id),
      })),
      meta: paginatedMeta(total, page, pageSize),
    };

    // Cache only anonymous-safe payload (without personal favorite flags)
    if (cacheKey && !auth) {
      cacheSet(cacheKey, payload, TEMPLATE_LIST_TTL_MS);
    }

    return NextResponse.json(payload, {
      headers: cacheable
        ? {
            "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
            "X-Vidoo-Cache": "MISS",
          }
        : { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
