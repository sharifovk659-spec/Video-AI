import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import { getFreeGenerationsLimit } from "@/lib/credits/charge";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [packages, freeLimit] = await Promise.all([
      prisma.creditPackage.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }],
      }),
      getFreeGenerationsLimit(),
    ]);

    return NextResponse.json({
      data: {
        freeGenerationsPerUser: freeLimit,
        packages: packages.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          credits: p.credits,
          priceCents: p.priceCents,
          currency: p.currency,
          isPopular: p.isPopular,
          benefits: p.benefits,
        })),
        proSubscription: {
          available: false,
          title: "Pro",
          description: "Coming soon — priority queue and bonus credits.",
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
