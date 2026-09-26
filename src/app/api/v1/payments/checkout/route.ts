import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { createPackagePayment } from "@/lib/payments/service";
import { getEnv } from "@/lib/config/env";

export const dynamic = "force-dynamic";

const schema = z.object({
  packageId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = schema.parse(await request.json());

    if (!getEnv().PAYMENTS_ENABLED) {
      return NextResponse.json(
        {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message:
              "Payments are not activated yet. Browse packages and check back soon.",
          },
          data: {
            paymentsEnabled: false,
          },
        },
        { status: 503 },
      );
    }

    const result = await createPackagePayment({
      userId: session.userId,
      packageId: body.packageId,
    });

    return NextResponse.json(
      {
        data: {
          paymentId: result.payment.id,
          status: result.payment.status,
          checkoutUrl: result.checkoutUrl,
          clientPayload: result.clientPayload,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
