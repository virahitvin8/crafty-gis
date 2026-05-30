import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external images (e.g., map tiles)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tile.openstreetmap.org" },
      { protocol: "https", hostname: "**.cartocdn.com" },
      { protocol: "https", hostname: "nominatim.openstreetmap.org" },
    ],
  },

  // Rewrite API calls to the backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },

  // Enable React strict mode
  reactStrictMode: true,
};

export default nextConfig;
