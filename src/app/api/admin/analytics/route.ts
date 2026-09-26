import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { AppError } from "@/lib/errors/app-error";
import {
  computeProductAnalytics,
  parseAnalyticsRange,
} from "@/lib/analytics/product-analytics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApiSession();
    let range;
    try {
      range = parseAnalyticsRange(request.nextUrl.searchParams);
    } catch (error) {
      throw new AppError(
        "VALIDATION_ERROR",
        error instanceof Error ? error.message : "Invalid date range",
      );
    }

    const data = await computeProductAnalytics(range);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
