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
          Входим через Telegram…
        </p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="px-4 pb-28 pt-10">
        <ErrorState
          title={outsideTelegram ? "Откройте в Telegram" : "Не удалось войти"}
          message={
            error ??
            "Не получилось авторизоваться. Откройте Vidoo AI кнопкой в боте."
          }
          onRetry={outsideTelegram ? undefined : () => void refresh()}
        />
        {outsideTelegram ? (
          <p className="mt-4 text-center text-xs text-zinc-500">
            В Telegram откройте бота и нажмите «Открыть Vidoo AI».
          </p>
        ) : null}
      </div>
    );
  }

  return <>{children}</>;
}
