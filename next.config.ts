import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
    deviceSizes: [640, 750, 1080, 1920], // Reduce generation sizes
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Permitir videos e imágenes pesadas
    },
  },
}

export default nextConfig
