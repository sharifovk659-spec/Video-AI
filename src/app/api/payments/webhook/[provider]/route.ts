import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { processPaymentWebhook } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ provider: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { provider } = await params;
    const body = Buffer.from(await request.arrayBuffer());
    const result = await processPaymentWebhook(
      request.headers,
      body,
      provider,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
