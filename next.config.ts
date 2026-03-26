import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  generateBuildId: () => `build-${Date.now()}`,
  headers: async () => [
    {
      // Prevent CDN from caching any API responses
      source: "/api/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
        { key: "CDN-Cache-Control", value: "no-store" },
        { key: "Vercel-CDN-Cache-Control", value: "no-store" },
        { key: "Pragma", value: "no-cache" },
      ],
    },
  ],
};

export default nextConfig;
