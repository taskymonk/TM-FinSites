import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  allowedDevOrigins: [
    "finexpert-onboard.preview.emergentagent.com",
    "finexpert-onboard.cluster-5.preview.emergentcf.cloud",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "finexpert-onboard.preview.emergentagent.com",
        "finexpert-onboard.cluster-5.preview.emergentcf.cloud",
        "finsites.taskymonk.com",
        "tm-fin-sites.vercel.app",
        "*.vercel.app",
      ],
    },
  },
};

export default nextConfig;
