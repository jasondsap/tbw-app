import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // serverComponentsExternalPackages moved to top-level in Next.js 15
  serverExternalPackages: ['@neondatabase/serverless'],
}

export default nextConfig
