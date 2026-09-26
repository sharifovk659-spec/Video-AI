export type CreatePaymentInput = {
  userId: string;
  amountCents: number;
  currency: string;
  creditsToGrant: number;
  description?: string;
  packageId?: string | null;
  metadata?: Record<string, unknown>;
};

export type CreatePaymentResult = {
  externalId: string;
  checkoutUrl?: string | null;
  clientPayload?: Record<string, unknown>;
};

export type VerifyPaymentResult = {
  externalId: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  paidAt?: Date | null;
};

export type WebhookHandleResult = {
  /** Unique key used for idempotent processing */
  eventKey: string;
  externalId: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  raw?: unknown;
};

/**
 * Provider-independent payment adapter.
 * Credits are granted only after server-side verified paid status.
 */
export interface PaymentProvider {
  readonly slug: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(externalId: string): Promise<VerifyPaymentResult>;
  handleWebhook(
    headers: Headers,
    body: string | Buffer,
  ): Promise<WebhookHandleResult>;
  refundPayment?(externalId: string): Promise<{ ok: boolean }>;
}
