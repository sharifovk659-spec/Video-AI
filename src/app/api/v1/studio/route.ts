import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handle-api-error";
import {
  assertStudioEligible,
  getStudioCreditCost,
} from "@/lib/studio/create-studio-generation";
import { getStudioLimits } from "@/lib/studio/safety";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    let eligible = true;
    let reason: string | null = null;
    try {
      await assertStudioEligible(session.userId);
    } catch (error) {
      eligible = false;
      reason = error instanceof Error ? error.message : "Not eligible";
    }

    const creditCost = await getStudioCreditCost();
    const limits = getStudioLimits();

    return NextResponse.json({
      data: {
        eligible,
        reason,
        creditCost,
        ...limits,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
