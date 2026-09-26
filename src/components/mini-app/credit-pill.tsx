"use client";

import Link from "next/link";
import { useMiniAppAuth } from "@/components/mini-app/providers/mini-app-auth-provider";

export function CreditPill() {
  const { user, loading } = useMiniAppAuth();
  const credits = user?.creditBalance ?? 0;
  const freeLeft = user?.freeGenerationsRemaining ?? 0;

  return (
    <Link
      href="/mini-app/pricing"
      className="vidoo-glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-violet-100"
    >
      <span className="h-2 w-2 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
      {loading ? "…" : `${credits} credits`}
      {!loading && freeLeft > 0 ? (
        <span className="text-[10px] text-emerald-300">· {freeLeft} free</span>
      ) : null}
    </Link>
  );
}
