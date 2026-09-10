// SPA static export
const isDev = process.env.NODE_ENV !== 'production'
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? ''

const nextConfig = {
  output: 'export', // Required for SPA
  reactStrictMode: true, // Enable strict mode for better debugging
  // Use absolute assets in dev server; keep relative paths for static export + file://
  assetPrefix: isDev ? '' : assetPrefix,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  turbopack: {},
  experimental: {
    // @phosphor-icons/react is a barrel of ~1500 icons. Without this, a static
    // export pulls the whole set into the client bundle instead of the few
    // dozen the app renders.
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS ? process.env.ALLOWED_DEV_ORIGINS.split(',') : ['192.168.0.15', '192.168.0.15:3000'], // NOSONAR
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
