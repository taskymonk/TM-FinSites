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
        "finsites.taskymonk.com",
        "tm-finsites.vercel.app",
        "tm-finsites-git-main-tmfinsites-7124s-projects.vercel.app",
        "tm-finsites-wx2mq4g2u-tmfinsites-7124s-projects.vercel.app",
      ],
    },
  },
};

export default nextConfig;
