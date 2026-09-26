import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.templateCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    return handleApiError(error);
  }
}
