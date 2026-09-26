import {
  CreditTransactionType,
  GenerationStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type AnalyticsRange = {
  from: Date;
  to: Date;
};

function dayKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function eachDayKeys(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const cur = new Date(Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  ));
  const end = new Date(Date.UTC(
    to.getUTCFullYear(),
    to.getUTCMonth(),
    to.getUTCDate(),
  ));
  while (cur <= end) {
    keys.push(dayKeyUtc(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return keys;
}

/**
 * Product analytics from real DB rows only.
 * Never includes private media URLs, prompts, or upload payloads.
 */
export async function computeProductAnalytics(range: AnalyticsRange) {
  const { from, to } = range;
  const started = Date.now();

  const genWhere: Prisma.GenerationWhereInput = {
    createdAt: { gte: from, lte: to },
  };
  const paidWhere: Prisma.PaymentWhereInput = {
    status: PaymentStatus.paid,
    OR: [
      { paidAt: { gte: from, lte: to } },
      { AND: [{ paidAt: null }, { createdAt: { gte: from, lte: to } }] },
    ],
  };

  const [
    newUsers,
    dauAccounts,
    generationsTotal,
    generationsCompleted,
    generationsFailed,
    generationsByDay,
    templateUsage,
    revenueAgg,
    creditsConsumedAgg,
    aiCostAgg,
    creditPurchaseTx,
  ] = await Promise.all([
    prisma.user.count({
      where: { createdAt: { gte: from, lte: to } },
    }),
    prisma.telegramAccount.findMany({
      where: { lastActiveAt: { gte: from, lte: to } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.generation.count({ where: genWhere }),
    prisma.generation.count({
      where: { ...genWhere, status: GenerationStatus.completed },
    }),
    prisma.generation.count({
      where: { ...genWhere, status: GenerationStatus.failed },
    }),
    prisma.generation.findMany({
      where: genWhere,
      select: { createdAt: true, status: true },
    }),
    prisma.generation.groupBy({
      by: ["templateId"],
      where: genWhere,
      _count: { _all: true },
      orderBy: { _count: { templateId: "desc" } },
      take: 15,
    }),
    prisma.payment.aggregate({
      where: paidWhere,
      _sum: { amountCents: true, creditsToGrant: true },
      _count: { _all: true },
    }),
    prisma.generation.aggregate({
      where: {
        ...genWhere,
        OR: [
          { creditsCharged: { gt: 0 } },
          { status: GenerationStatus.completed },
        ],
      },
      _sum: { creditsCharged: true },
    }),
    prisma.generation.aggregate({
      where: genWhere,
      _sum: { estimatedProviderCostCents: true },
    }),
    prisma.creditTransaction.aggregate({
      where: {
        type: CreditTransactionType.credit,
        paymentId: { not: null },
        createdAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
    }),
  ]);

  const templateIds = templateUsage.map((t) => t.templateId);
  const templates = templateIds.length
    ? await prisma.template.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, slug: true, title: true },
      })
    : [];
  const templateMap = new Map(templates.map((t) => [t.id, t]));

  const dayMap = new Map<
    string,
    { generations: number; completed: number; failed: number }
  >();
  for (const key of eachDayKeys(from, to)) {
    dayMap.set(key, { generations: 0, completed: 0, failed: 0 });
  }
  for (const g of generationsByDay) {
    const key = dayKeyUtc(g.createdAt);
    const row = dayMap.get(key) ?? {
      generations: 0,
      completed: 0,
      failed: 0,
    };
    row.generations += 1;
    if (g.status === GenerationStatus.completed) row.completed += 1;
    if (g.status === GenerationStatus.failed) row.failed += 1;
    dayMap.set(key, row);
  }

  const revenueCents = revenueAgg._sum.amountCents ?? 0;
  const estimatedAiCostCents = aiCostAgg._sum.estimatedProviderCostCents ?? 0;
  const creditsPurchased =
    revenueAgg._sum.creditsToGrant ||
    creditPurchaseTx._sum.amount ||
    0;
  const creditsConsumed = creditsConsumedAgg._sum.creditsCharged ?? 0;

  const decided = generationsCompleted + generationsFailed;
  const successRate =
    decided > 0 ? generationsCompleted / decided : null;
  const failureRate =
    decided > 0 ? generationsFailed / decided : null;

  return {
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    summary: {
      dailyActiveUsers: dauAccounts.length,
      newUsers,
      generations: generationsTotal,
      generationsCompleted,
      generationsFailed,
      successRate,
      failureRate,
      creditsPurchased,
      creditsConsumed,
      revenueCents,
      estimatedAiCostCents,
      estimatedGrossMarginCents: revenueCents - estimatedAiCostCents,
      paidPayments: revenueAgg._count._all,
    },
    generationsPerDay: [...dayMap.entries()].map(([date, row]) => ({
      date,
      ...row,
    })),
    mostUsedTemplates: templateUsage.map((row) => {
      const t = templateMap.get(row.templateId);
      return {
        templateId: row.templateId,
        slug: t?.slug ?? null,
        title: t?.title ?? "Unknown",
        generations: row._count._all,
      };
    }),
    meta: {
      queryMs: Date.now() - started,
      source: "database" as const,
    },
  };
}

export function parseAnalyticsRange(
  searchParams: URLSearchParams,
): AnalyticsRange {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  defaultFrom.setUTCHours(0, 0, 0, 0);

  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");

  const from = fromRaw ? new Date(fromRaw) : defaultFrom;
  const to = toRaw ? new Date(toRaw) : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid from/to date");
  }
  if (from > to) {
    throw new Error("`from` must be before `to`");
  }
  // Cap range to 366 days to protect the DB
  const maxMs = 366 * 24 * 60 * 60 * 1000;
  if (to.getTime() - from.getTime() > maxMs) {
    throw new Error("Date range too large (max 366 days)");
  }

  return { from, to };
}
