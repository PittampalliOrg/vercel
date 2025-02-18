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
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            // Instead of `*`, list the exact origin that is making the request.
            // e.g., if your site is served at http://localhost:3003,
            // and your server is also at the same http://localhost:3003, 
            // you wouldn't need CORS at all. 
            // But if it's truly cross-origin, specify it exactly here:
            key: 'Access-Control-Allow-Origin',
            value: 'http://localhost:3003', 
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            // no literal `...`
            value: 'Content-Type, traceparent',
          },
          {
            // This is required when using `credentials: "include"`
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
