import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Vidoo AI",
    template: "%s | Vidoo AI",
  },
  description: "AI video generation for Telegram",
  metadataBase: new URL("https://video.inovaauto.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${inter.variable} min-h-dvh overflow-x-hidden bg-[#050508] font-sans text-zinc-50 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
