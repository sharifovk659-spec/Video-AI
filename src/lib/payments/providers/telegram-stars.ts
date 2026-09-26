/**
 * Placeholder for Telegram Stars.
 * Wire Bot API invoice / successful_payment webhook here later.
 */
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  VerifyPaymentResult,
  WebhookHandleResult,
} from "@/lib/payments/types";
import { AppError } from "@/lib/errors/app-error";
import { getEnv } from "@/lib/config/env";

export class TelegramStarsPaymentProvider implements PaymentProvider {
  readonly slug = "telegram_stars";

  private requireConfigured(): void {
    if (!getEnv().TELEGRAM_BOT_TOKEN) {
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Telegram Stars provider requires TELEGRAM_BOT_TOKEN",
        { expose: false },
      );
    }
    if (!getEnv().PAYMENTS_ENABLED) {
      throw new AppError("SERVICE_UNAVAILABLE", "Payments are not enabled");
    }
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    this.requireConfigured();
    void input;
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Telegram Stars checkout is not activated yet",
    );
  }

  async verifyPayment(externalId: string): Promise<VerifyPaymentResult> {
    this.requireConfigured();
    return { externalId, status: "pending" };
  }

  async handleWebhook(
    headers: Headers,
    body: string | Buffer,
  ): Promise<WebhookHandleResult> {
    void headers;
    void body;
    this.requireConfigured();
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Telegram Stars webhooks are not activated yet",
    );
  }
}
