/** @type {import('next').NextConfig} */
// Allow basePath to be overridden via environment variable
// For Cloudflare Pages root deployment, set NEXT_PUBLIC_BASE_PATH to "/" or "ROOT"
// For GitHub Pages subdirectory, use '/disobedience-archive' or leave unset
const basePathEnv = process.env.NEXT_PUBLIC_BASE_PATH;
// Treat "/", "ROOT", empty string, or undefined as root deployment (empty basePath)
const basePath = (!basePathEnv || basePathEnv === '/' || basePathEnv === 'ROOT' || basePathEnv.trim() === '') 
  ? '' 
  : basePathEnv;
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig = {
  // Only use 'export' for production builds, not dev mode
  ...(isProduction ? { output: 'export' } : {}),
  basePath: basePath,
  // assetPrefix is automatically set by Next.js based on basePath
  // Only set explicitly if basePath is empty (root deployment)
  ...(isProduction && !basePath ? { assetPrefix: '' } : {}),
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

