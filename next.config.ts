import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  serverExternalPackages: ["dockerode", "ssh2", "cpu-features"],
};

export default nextConfig;
