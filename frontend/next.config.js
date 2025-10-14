/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimized images configuration
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'replicate.delivery' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  // Disable source maps in production for 3x faster builds
  productionBrowserSourceMaps: false,
  // Optimize build output
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // Disable Next.js telemetry for faster builds
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-slot'],
  },
  // Output standalone for Railway deployment
  output: 'standalone',
  // Backend API rewrites
  async rewrites() {
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '8000'
    return [
      {
        source: '/api/backend/:path*',
        destination: `http://localhost:${backendPort}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;