import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow subdomain dev hosts like furniture-shop.localhost:3000
  allowedDevOrigins: ["*.localhost"],
};

export default nextConfig;
