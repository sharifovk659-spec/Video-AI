import { getEnv } from "@/lib/config/env";
import type { PaymentProvider } from "@/lib/payments/types";
import { StubPaymentProvider } from "@/lib/payments/providers/stub";
import { TelegramStarsPaymentProvider } from "@/lib/payments/providers/telegram-stars";
import { AppError } from "@/lib/errors/app-error";

const registry = new Map<string, PaymentProvider>();

function bootstrap() {
  if (registry.size > 0) return;
  registry.set("stub", new StubPaymentProvider());
  registry.set("telegram_stars", new TelegramStarsPaymentProvider());
}

export function getPaymentProvider(slug?: string): PaymentProvider {
  bootstrap();
  const key = (slug || getEnv().PAYMENT_PROVIDER || "stub").toLowerCase();
  const provider = registry.get(key);
  if (!provider) {
    throw new AppError("SERVICE_UNAVAILABLE", `Unknown payment provider: ${key}`);
  }
  return provider;
}
