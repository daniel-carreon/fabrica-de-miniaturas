/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  images: {
    domains: ['replicate.delivery', 'supabase.co', 'localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  // Configuración para API routes que se comunicarán con el backend Python
  async rewrites() {
    // Try to detect backend port dynamically
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '8000'

    return [
      {
        source: '/api/backend/:path*',
        destination: `http://localhost:${backendPort}/:path*`, // Dynamic FastAPI backend
      },
    ];
  },
  // Variables de entorno que Next.js puede usar
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

module.exports = nextConfig;