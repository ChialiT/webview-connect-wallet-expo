/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Enable static export for better Vercel performance
  output: process.env.NODE_ENV === 'production' ? 'export' : 'standalone',
  // Disable API routes for static export
  experimental: {
    appDir: true
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Wallet Auth Service',
    NEXT_PUBLIC_ALLOWED_ORIGINS: process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || 'http://localhost:19006,https://localhost:19006'
  }
}

module.exports = nextConfig 