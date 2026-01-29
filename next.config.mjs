/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use 'export' for production builds, not dev mode
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  basePath: '/disobedience-archive', // Your repository name
  assetPrefix: '/disobedience-archive/', // Your repository name with trailing slash
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig

