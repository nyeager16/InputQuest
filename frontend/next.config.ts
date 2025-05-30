import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['img.youtube.com'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;