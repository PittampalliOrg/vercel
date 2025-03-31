// import unTypiaNext from "@ryoppippi/unplugin-typia/next";
import type { NextConfig } from 'next';
 
const config: NextConfig = {
  basePath: "/frontend",
  assetPrefix: "/frontend",
  images: {domains: ["avatar.vercel.sh", "localhost/frontend"], },
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
