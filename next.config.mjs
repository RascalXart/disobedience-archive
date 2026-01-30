/** @type {import('next').NextConfig} */
// Allow basePath to be overridden via environment variable
// For Cloudflare Pages root deployment, set NEXT_PUBLIC_BASE_PATH to "/" or "ROOT"
// For GitHub Pages subdirectory, use '/disobedience-archive' or leave unset
// In development, always use root (no basePath) for easier local testing
const basePathEnv = process.env.NEXT_PUBLIC_BASE_PATH;
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// In development, always use root path. In production, respect the env var
const basePath = isDevelopment 
  ? '' 
  : (!basePathEnv || basePathEnv === '/' || basePathEnv === 'ROOT' || (basePathEnv && basePathEnv.trim() === ''))
    ? ''
    : basePathEnv;

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

