// @ts-check
/** @type {import('next').NextConfig} */
module.exports = {
  output: "export",
  reactStrictMode: false,
  transpilePackages: [],
  compiler: {
    styledComponents: true
  },
  productionBrowserSourceMaps: true,
  webpack: (config) => {
    return config;
  }
};
