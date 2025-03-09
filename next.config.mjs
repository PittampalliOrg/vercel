// import unTypiaNext from "@ryoppippi/unplugin-typia/next";
 
/** @type {import('next').NextConfig} */
const config = {
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
      productionBrowserSourceMaps: true
      
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