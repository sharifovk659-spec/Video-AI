import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { BottomNav } from "@/components/mini-app/bottom-nav";
import { MiniAppAuthProvider } from "@/components/mini-app/providers/mini-app-auth-provider";
import { TelegramWebAppBootstrap } from "@/components/mini-app/telegram-webapp-bootstrap";

export const metadata: Metadata = {
  title: "Vidoo AI",
  description: "AI video templates in Telegram",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050508",
};

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* afterInteractive: first paint without blocking on Telegram SDK */}
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
      />
      <div className="vidoo-gradient-bg min-h-dvh text-zinc-50 antialiased">
        <MiniAppAuthProvider>
          <TelegramWebAppBootstrap />
          <div className="mx-auto min-h-dvh w-full max-w-lg">{children}</div>
          <BottomNav />
        </MiniAppAuthProvider>
      </div>
    </>
  );
}
