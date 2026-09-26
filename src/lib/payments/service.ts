import { createHash } from "node:crypto";
import { PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getPaymentProvider } from "@/lib/payments/registry";
import { grantCreditsFromPayment } from "@/lib/credits/charge";
import { AppError } from "@/lib/errors/app-error";
import { createLogger } from "@/lib/logger";

const log = createLogger("payments");

export async function createPackagePayment(args: {
  userId: string;
  packageId: string;
}) {
  const pkg = await prisma.creditPackage.findFirst({
    where: { id: args.packageId, isActive: true },
  });
  if (!pkg) {
    throw new AppError("NOT_FOUND", "Package not found");
  }

  const provider = getPaymentProvider();
  const created = await provider.createPayment({
    userId: args.userId,
    amountCents: pkg.priceCents,
    currency: pkg.currency,
    creditsToGrant: pkg.credits,
    description: pkg.name,
    packageId: pkg.id,
    metadata: { packageSlug: pkg.slug },
  });

  const payment = await prisma.payment.create({
    data: {
      userId: args.userId,
      packageId: pkg.id,
      amountCents: pkg.priceCents,
      currency: pkg.currency,
      creditsToGrant: pkg.credits,
      status: PaymentStatus.pending,
      provider: provider.slug,
      externalId: created.externalId,
      description: pkg.name,
      metadata: {
        checkoutUrl: created.checkoutUrl ?? null,
        clientPayload: created.clientPayload ?? null,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    payment,
    checkoutUrl: created.checkoutUrl,
    clientPayload: created.clientPayload,
  };
}

export async function applyVerifiedPaymentStatus(args: {
  externalId: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  eventKey: string;
  provider: string;
  raw?: unknown;
}): Promise<{ granted: boolean }> {
  const payloadHash = args.raw
    ? createHash("sha256").update(JSON.stringify(args.raw)).digest("hex")
    : null;

  const outcome = await prisma.$transaction(async (tx) => {
    const existingEvent = await tx.paymentWebhookEvent.findUnique({
      where: { eventKey: args.eventKey },
    });
    if (existingEvent) {
      return { action: "noop" as const };
    }

    const payment = await tx.payment.findUnique({
      where: { externalId: args.externalId },
    });
    if (!payment) {
      throw new AppError("NOT_FOUND", "Payment not found for webhook");
    }

    await tx.paymentWebhookEvent.create({
      data: {
        provider: args.provider,
        eventKey: args.eventKey,
        paymentId: payment.id,
        payloadHash,
      },
    });

    if (args.status === "paid") {
      if (payment.status === PaymentStatus.paid && payment.creditsGranted) {
        return { action: "noop" as const };
      }
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.paid, paidAt: new Date() },
      });
      return {
        action: "grant" as const,
        paymentId: payment.id,
        userId: payment.userId,
        credits: payment.creditsToGrant,
        alreadyGranted: payment.creditsGranted,
      };
    }

    if (args.status === "failed") {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.failed, failedAt: new Date() },
      });
    } else if (args.status === "cancelled") {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.cancelled },
      });
    } else if (args.status === "refunded") {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.refunded, refundedAt: new Date() },
      });
    }

    return { action: "noop" as const };
  });

  if (outcome.action === "grant" && !outcome.alreadyGranted) {
    await grantCreditsFromPayment({
      userId: outcome.userId,
      paymentId: outcome.paymentId,
      credits: outcome.credits,
    });
    log.info("Credits granted after verified payment", {
      paymentId: outcome.paymentId,
    });
    return { granted: true };
  }

  return { granted: false };
}

export async function processPaymentWebhook(
  headers: Headers,
  body: string | Buffer,
  providerSlug?: string,
) {
  const provider = getPaymentProvider(providerSlug);
  const handled = await provider.handleWebhook(headers, body);
  return applyVerifiedPaymentStatus({
    externalId: handled.externalId,
    status: handled.status,
    eventKey: handled.eventKey,
    provider: provider.slug,
    raw: handled.raw,
  });
}
