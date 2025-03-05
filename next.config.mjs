import unTypiaNext from "@ryoppippi/unplugin-typia/next";
 
/** @type {import('next').NextConfig} */
const config = {
      productionBrowserSourceMaps: true
};
export default unTypiaNext(
  config,
  {
    cache: true,
    typia: {
        functional: true,
    }
  }
);