import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: false
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true
    }
  }
};

export default nextConfig;
