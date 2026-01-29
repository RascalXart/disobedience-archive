/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/disobedience-archive',
  assetPrefix: '/disobedience-archive',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig

