"use client";

import type { ReactNode } from "react";
import { useMiniAppAuth } from "@/components/mini-app/providers/mini-app-auth-provider";
import { ErrorState, SkeletonBlock } from "@/components/mini-app/states";

export function MiniAppAuthGate({ children }: { children: ReactNode }) {
  const { user, loading, error, outsideTelegram, refresh } = useMiniAppAuth();

  if (loading) {
    return (
      <div className="space-y-4 px-4 pb-28 pt-8">
        <SkeletonBlock className="h-8 w-40" />
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-48 w-full" />
        <p className="text-center text-xs text-zinc-500">
          Signing in with Telegram…
        </p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="px-4 pb-28 pt-10">
        <ErrorState
          title={outsideTelegram ? "Open inside Telegram" : "Sign-in failed"}
          message={
            error ??
            "Could not authenticate. Open Vidoo AI from the Telegram bot button."
          }
          onRetry={outsideTelegram ? undefined : () => void refresh()}
        />
        {outsideTelegram ? (
          <p className="mt-4 text-center text-xs text-zinc-500">
            In Telegram, open the bot and tap «Открыть Vidoo AI».
          </p>
        ) : null}
      </div>
    );
  }

  return <>{children}</>;
}
