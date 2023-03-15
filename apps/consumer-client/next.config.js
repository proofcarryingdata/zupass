module.exports = {
  reactStrictMode: true,
  transpilePackages: ["ui"],
  compiler: {
    styledComponents: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
    };
    return config;
  },
};
