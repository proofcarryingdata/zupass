// @ts-check
/** @type {import('next').NextConfig} */
module.exports = {
  output: "export",
  reactStrictMode: false,
  transpilePackages: [],
  compiler: {
    styledComponents: true
  },
  images: {
    unoptimized: true
  },
  webpack: (config) => {
    return config;
  }
};
