// @ts-check

const webpack = require("webpack");

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
    config.resolve.fallback = {
      fs: false,
      buffer: require.resolve("buffer/")
    };
    config.plugins = [
      ...config.plugins,
      new webpack.ProvidePlugin({
        // process: "process/browser",
        Buffer: ["buffer", "Buffer"]
      })
      // NodeGlobalsPolyfillPlugin({
      //   process: true,
      //   buffer: true
      // })
    ];
    return config;
  }
};
