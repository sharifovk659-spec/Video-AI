"use client";

import { useEffect } from "react";

/** Speeds Telegram WebView paint: signal ready ASAP, expand to full height. */
export function TelegramWebAppBootstrap() {
  useEffect(() => {
    const tg = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            ready?: () => void;
            expand?: () => void;
            disableVerticalSwipes?: () => void;
            setHeaderColor?: (c: string) => void;
            setBackgroundColor?: (c: string) => void;
          };
        };
      }
    ).Telegram?.WebApp;

    if (!tg) return;
    try {
      tg.ready?.();
      tg.expand?.();
      tg.setHeaderColor?.("#050508");
      tg.setBackgroundColor?.("#050508");
    } catch {
      /* older clients */
    }
  }, []);

  return null;
}
