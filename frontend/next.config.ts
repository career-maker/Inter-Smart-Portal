import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "framer-motion",
      "@tanstack/react-query",
      "clsx",
      "tailwind-merge",
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/biometric/ingest",
        destination: "https://workplace.intersmart.in/api/api/v1/biometric/ingest",
      },
      {
        source: "/api/api/v1/biometric/ingest",
        destination: "https://workplace.intersmart.in/api/api/v1/biometric/ingest",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
