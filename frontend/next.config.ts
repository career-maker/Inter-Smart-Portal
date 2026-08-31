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
};

export default nextConfig;
