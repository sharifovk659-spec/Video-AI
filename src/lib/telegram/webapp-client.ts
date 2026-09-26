/** Minimal Telegram WebApp typings used by the Mini App client. */

export type TelegramWebAppBackButton = {
  isVisible?: boolean;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
};

export type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: { user?: { id?: number } };
  ready: () => void;
  expand: () => void;
  close?: () => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  BackButton?: TelegramWebAppBackButton;
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  platform?: string;
  version?: string;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function getTelegramInitData(): string | null {
  const raw = getTelegramWebApp()?.initData?.trim();
  return raw && raw.length > 0 ? raw : null;
}

/**
 * Wait until the official Telegram WebApp script exposes `Telegram.WebApp`.
 * Returns null if we are outside Telegram (ordinary browser).
 */
export async function waitForTelegramWebApp(
  timeoutMs = 4_000,
): Promise<TelegramWebApp | null> {
  if (typeof window === "undefined") return null;

  const existing = getTelegramWebApp();
  if (existing) return existing;

  const started = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const tg = getTelegramWebApp();
      if (tg) {
        resolve(tg);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}
