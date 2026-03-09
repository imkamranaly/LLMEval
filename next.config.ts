import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for pdf-lib and other packages that use node APIs
  serverExternalPackages: ["pdf-lib"],
};

export default nextConfig;
