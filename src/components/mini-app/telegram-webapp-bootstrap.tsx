"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getTelegramWebApp,
  waitForTelegramWebApp,
} from "@/lib/telegram/webapp-client";

const ROOT_PATHS = new Set(["/mini-app", "/mini-app/"]);

/**
 * Initializes Telegram WebApp shell: ready, expand, theme, BackButton.
 * Back on nested routes navigates in-app; on root, BackButton is hidden
 * so Telegram's Close remains the exit path.
 */
export function TelegramWebAppBootstrap() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let backHandler: (() => void) | null = null;

    void (async () => {
      const tg = await waitForTelegramWebApp();
      if (cancelled || !tg) return;

      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor?.("#050508");
        tg.setBackgroundColor?.("#050508");
        tg.disableVerticalSwipes?.();
      } catch {
        /* older clients */
      }

      const back = tg.BackButton;
      if (!back) return;

      const isRoot = ROOT_PATHS.has(pathname);
      if (isRoot) {
        back.hide();
        return;
      }

      backHandler = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/mini-app");
        }
      };
      back.onClick(backHandler);
      back.show();
    })();

    return () => {
      cancelled = true;
      const tg = getTelegramWebApp();
      if (tg?.BackButton && backHandler) {
        try {
          tg.BackButton.offClick(backHandler);
          tg.BackButton.hide();
        } catch {
          /* ignore */
        }
      }
    };
  }, [pathname, router]);

  return null;
}
