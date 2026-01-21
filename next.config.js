// SPA static export
const nextConfig = {
  output: 'export', // Required for SPA
  reactStrictMode: true, // Enable strict mode for better debugging
  // Use relative paths for assets - required for file:// protocol in mobile WebView
  assetPrefix: './',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  turbopack: {},
  webpack(config, { dev }) {
    if (dev) {
      // Reduce CPU/memory from file watching
      config.watchOptions = {
        poll: 2000, // check every 2 seconds
        aggregateTimeout: 300, // wait before rebuilding
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
