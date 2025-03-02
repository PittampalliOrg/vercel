/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set the base path for the application
  // basePath: '/frontend', // or '/playground' for the other app
  
  // // Match asset prefix with the base path
  // assetPrefix: '/frontend', // or '/playground' for the other app
  
  // Use standalone output mode for better deployment
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  // Add custom cache headers for API routes
  async headers() {
    return [
      {
        // Add no-cache headers to API routes
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" }
        ]
      },
      {
        // Optional: Add CORS headers if needed
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" }
        ]
      }
    ];
  },
  
  // Optional: Add rewrites if you need to handle specific paths differently
  async rewrites() {
    return {
      beforeFiles: [
        // Example: You can add custom rewrites here if needed
        // {
        //   source: '/some-path',
        //   destination: '/custom-destination'
        // }
      ]
    };
  }
}

module.exports = nextConfig;