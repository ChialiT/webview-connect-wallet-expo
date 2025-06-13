/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  output: 'export', // Enable static exports
  images: {
    unoptimized: true
  },
  // appDir is enabled by default in Next.js 14, no need for the experimental flag.
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Wallet Auth Service',
    NEXT_PUBLIC_ALLOWED_ORIGINS: process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || 'http://localhost:19006,https://localhost:19006'
  },
  // Configure page extensions
  pageExtensions: ['js', 'jsx', 'ts', 'tsx']
}

module.exports = nextConfig 