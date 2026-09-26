import { randomUUID } from "node:crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  VerifyPaymentResult,
  WebhookHandleResult,
} from "@/lib/payments/types";
import { AppError } from "@/lib/errors/app-error";
import { getEnv } from "@/lib/config/env";

/**
 * Configurable stub — no real charges.
 * Swap for Telegram Stars / other providers without rewriting app logic.
 */
export class StubPaymentProvider implements PaymentProvider {
  readonly slug = "stub";

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!getEnv().PAYMENTS_ENABLED) {
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Payments are not enabled yet. Packages are visible for browsing only.",
      );
    }
    const externalId = `stub_${randomUUID()}`;
    return {
      externalId,
      checkoutUrl: null,
      clientPayload: {
        provider: this.slug,
        amountCents: input.amountCents,
        currency: input.currency,
        message: "Payment provider not connected",
      },
    };
  }

  async verifyPayment(externalId: string): Promise<VerifyPaymentResult> {
    return { externalId, status: "pending" };
  }

  async handleWebhook(
    _headers: Headers,
    body: string | Buffer,
  ): Promise<WebhookHandleResult> {
    void body;
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Stub payment provider does not accept webhooks",
    );
  }

  async refundPayment(externalId: string): Promise<{ ok: boolean }> {
    void externalId;
    return { ok: false };
  }
}
