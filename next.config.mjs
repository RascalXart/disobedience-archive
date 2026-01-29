/** @type {import('next').NextConfig} */
// Allow basePath to be overridden via environment variable
// For Cloudflare Pages root deployment, set NEXT_PUBLIC_BASE_PATH to empty string
// For GitHub Pages subdirectory, use '/disobedience-archive' or leave unset
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/disobedience-archive';
const assetPrefix = basePath ? `${basePath}/` : '';

const nextConfig = {
  // Only use 'export' for production builds, not dev mode
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  basePath: basePath,
  assetPrefix: assetPrefix,
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

