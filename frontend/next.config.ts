import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "finexpert-onboard.preview.emergentagent.com",
    "finexpert-onboard.cluster-5.preview.emergentcf.cloud",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "finexpert-onboard.preview.emergentagent.com",
        "finexpert-onboard.cluster-5.preview.emergentcf.cloud",
      ],
    },
  },
};

export default nextConfig;
