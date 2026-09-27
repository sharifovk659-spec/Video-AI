import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { BottomNav } from "@/components/mini-app/bottom-nav";
import { MiniAppAuthGate } from "@/components/mini-app/mini-app-auth-gate";
import { MiniAppAuthProvider } from "@/components/mini-app/providers/mini-app-auth-provider";
import { TelegramWebAppBootstrap } from "@/components/mini-app/telegram-webapp-bootstrap";

export const metadata: Metadata = {
  title: "Vidoo AI",
  description: "AI-видео в Telegram",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050508",
};

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Load early so initData is available before auth runs */}
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <div className="vidoo-gradient-bg min-h-dvh text-zinc-50 antialiased">
        <MiniAppAuthProvider>
          <TelegramWebAppBootstrap />
          <MiniAppAuthGate>
            <div className="page-shell min-h-dvh pt-[env(safe-area-inset-top)]">
              {children}
            </div>
            <BottomNav />
          </MiniAppAuthGate>
        </MiniAppAuthProvider>
      </div>
    </>
  );
}
