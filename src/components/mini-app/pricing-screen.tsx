"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMiniAppAuth } from "@/components/mini-app/providers/mini-app-auth-provider";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/mini-app/states";

type PricingData = {
  freeGenerationsPerUser: number;
  packages: Array<{
    id: string;
    name: string;
    credits: number;
    priceCents: number;
    currency: string;
    isPopular: boolean;
    benefits: string | null;
  }>;
  proSubscription: { available: boolean; title: string; description: string };
};

function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function PricingScreen() {
  const { user } = useMiniAppAuth();
  const [data, setData] = useState<PricingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      void fetch("/api/v1/pricing")
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error?.message ?? "Failed");
          setData(json.data);
        })
        .catch((err) =>
          setError(err instanceof Error ? err.message : "Failed to load pricing"),
        );
    });
  }, []);

  const purchase = async (packageId: string) => {
    setBusyId(packageId);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/v1/payments/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatusMsg(json.error?.message ?? "Purchase unavailable");
        return;
      }
      setStatusMsg(`Payment ${json.data.status}. Provider checkout will open when activated.`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <div className="p-4 pb-28">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3 p-4 pb-28">
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      <header>
        <h1 className="text-xl font-semibold text-white">Pricing</h1>
        <p className="text-xs text-zinc-400">Packages are managed from Admin — not hardcoded.</p>
      </header>

      <div className="vidoo-glass vidoo-glow rounded-2xl p-4">
        <p className="text-xs text-zinc-400">Current balance</p>
        <p className="text-3xl font-semibold text-white">{user?.creditBalance ?? 0}</p>
        <p className="mt-1 text-xs text-emerald-300">
          Free left: {user?.freeGenerationsRemaining ?? 0} /{" "}
          {data.freeGenerationsPerUser}
        </p>
      </div>

      <section className="vidoo-glass rounded-2xl p-4">
        <p className="text-sm font-semibold text-violet-100">Free</p>
        <p className="mt-1 text-xs text-zinc-400">
          Every new user gets exactly {data.freeGenerationsPerUser} free generations.
          After that, packages or credits are required.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-violet-100">Credit packages</h2>
        {data.packages.length === 0 ? (
          <EmptyState
            title="No packages yet"
            description="An admin can publish packages from the Admin Panel."
          />
        ) : (
          data.packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`vidoo-glass rounded-2xl p-4 ${pkg.isPopular ? "vidoo-glow border-violet-400/40" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{pkg.name}</p>
                  <p className="text-xs text-zinc-400">{pkg.credits} credits</p>
                </div>
                {pkg.isPopular ? (
                  <span className="rounded-full bg-violet-500/30 px-2 py-0.5 text-[10px] uppercase text-violet-100">
                    Popular
                  </span>
                ) : null}
              </div>
              {pkg.benefits ? (
                <p className="mt-2 text-xs text-zinc-400">{pkg.benefits}</p>
              ) : null}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-violet-100">
                  {formatPrice(pkg.priceCents, pkg.currency)}
                </span>
                <button
                  type="button"
                  disabled={busyId === pkg.id}
                  onClick={() => void purchase(pkg.id)}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {busyId === pkg.id ? "…" : "Purchase"}
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="vidoo-glass rounded-2xl p-4 opacity-90">
        <p className="text-sm font-semibold text-violet-100">
          {data.proSubscription.title}
        </p>
        <p className="mt-1 text-xs text-zinc-400">{data.proSubscription.description}</p>
        <button
          type="button"
          disabled
          className="mt-3 w-full rounded-xl bg-zinc-800 py-2 text-xs text-zinc-500"
        >
          Coming soon
        </button>
      </section>

      {statusMsg ? (
        <p className="text-center text-xs text-violet-200">{statusMsg}</p>
      ) : null}

      <Link href="/mini-app/profile" className="block text-center text-sm text-violet-300">
        Payment history in Profile
      </Link>
    </div>
  );
}
