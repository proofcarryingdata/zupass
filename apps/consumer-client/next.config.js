module.exports = {
  reactStrictMode: true,
  transpilePackages: [],
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
