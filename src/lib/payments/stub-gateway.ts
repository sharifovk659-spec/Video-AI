import { getPaymentProvider } from "@/lib/payments/registry";

/** @deprecated Use getPaymentProvider() */
export const paymentGateway = {
  createPaymentIntent: async () => {
    const provider = getPaymentProvider();
    return provider.createPayment({
      userId: "legacy",
      amountCents: 0,
      currency: "USD",
      creditsToGrant: 0,
    });
  },
};
