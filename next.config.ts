import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Permitir videos e imágenes pesadas
    },
  },
}

export default nextConfig
