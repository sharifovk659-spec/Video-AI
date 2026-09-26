import { NextResponse } from "next/server";
import { GenerationStatus, PaymentStatus, TemplateStatus } from "@prisma/client";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  try {
    await requireAdminApiSession();
    const todayStart = startOfTodayUtc();

    const [
      totalUsers,
      todayUsers,
      totalGenerations,
      successfulGenerations,
      failedGenerations,
      revenueAgg,
      activeTemplates,
      creditsChargedAgg,
      aiCostAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.telegramAccount.count({
        where: { lastActiveAt: { gte: todayStart } },
      }),
      prisma.generation.count(),
      prisma.generation.count({ where: { status: GenerationStatus.completed } }),
      prisma.generation.count({ where: { status: GenerationStatus.failed } }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.paid },
        _sum: { amountCents: true },
      }),
      prisma.template.count({ where: { status: TemplateStatus.active } }),
      prisma.generation.aggregate({
        _sum: { creditsCharged: true },
      }),
      prisma.generation.aggregate({
        _sum: { estimatedProviderCostCents: true },
      }),
    ]);

    const revenueCents = revenueAgg._sum.amountCents ?? 0;
    const apiEstimatedCostCents =
      aiCostAgg._sum.estimatedProviderCostCents ?? 0;

    return NextResponse.json({
      data: {
        totalUsers,
        todayUsers,
        totalGenerations,
        successfulGenerations,
        failedGenerations,
        revenueCents,
        apiEstimatedCostCents,
        estimatedGrossMarginCents: revenueCents - apiEstimatedCostCents,
        creditsChargedTotal: creditsChargedAgg._sum.creditsCharged ?? 0,
        activeTemplates,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
