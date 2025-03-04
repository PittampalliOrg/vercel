import unTypiaNext from "@ryoppippi/unplugin-typia/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  
};

/** @type {import("unplugin-typia").Options} */
const unpluginTypiaOptions = { /* your unplugin-typia options */ };

export default unTypiaNext(nextConfig, unpluginTypiaOptions);

// you can omit the unplugin-typia options when you don't need to customize it
// export default unTypiaNext(nextConfig);