import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingRoot: process.cwd(),
  async redirects() {
    return [
      {
        source: "/dashboard/communication_coach",
        destination: "/dashboard/communication-coach",
        permanent: true,
      },
      {
        source: "/dashboard/communication_coach/:path*",
        destination: "/dashboard/communication-coach/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
