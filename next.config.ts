import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  experimental: {
    optimizePackageImports: ["grammy"],
  },
  images: {
    // Prefer lazy native img for Mini App media endpoints; allow remote covers if used
    remotePatterns: [
      { protocol: "https", hostname: "video.inovaauto.com" },
      { protocol: "https", hostname: "*.telegram.org" },
    ],
  },
  async headers() {
    return [
      {
        source: "/mini-app/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
          },
        ],
      },
      {
        source: "/api/v1/home",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=30, stale-while-revalidate=60",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
