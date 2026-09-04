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
};

export default nextConfig;
