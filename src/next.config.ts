import type { NextConfig } from "next"

const config: NextConfig = {
  basePath: "/frontend",
  images: { domains: ["avatar.vercel.sh", "localhost/frontend"] },
  productionBrowserSourceMaps: true,
  experimental: {
    nodeMiddleware: true,
  },
}

export default config

