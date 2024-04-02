// @ts-check

/** @type {import('next').NextConfig} */
// eslint-disable-next-line no-undef
module.exports = {
  output: "export",
  reactStrictMode: false,
  transpilePackages: [],
  compiler: {
    styledComponents: true
  },
  productionBrowserSourceMaps: true,
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false
    };
    return config;
  }
};
