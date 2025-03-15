// import unTypiaNext from "@ryoppippi/unplugin-typia/next";
import type { NextConfig } from 'next';
 
const config: NextConfig = {
  basePath: "/frontend",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatar.vercel.sh",
        port: "",
        pathname: "**",
      },
    ],
  },
  productionBrowserSourceMaps: true,
  experimental: {
    nodeMiddleware: true,
  },
};

export default config;

// unTypiaNext(
//   config,
//   {
//     cache: true,
//     typia: {
//         functional: true,
//     }
//   }
// );
