import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@clerk/nextjs"],
  },
};

export default nextConfig;
