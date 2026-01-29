/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // For static export to GitHub Pages
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

