import type { Metadata } from 'next'
import './globals.css'
import { MuseumNavigation } from '@/components/MuseumNavigation'
import { AnimatedNoise } from '@/components/AnimatedNoise'

// Favicon configuration - use absolute paths for production
// Next.js static export handles public folder assets at root
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://rascalx.xyz'),
  title: 'Rascal Art',
  description: 'Anonymous crypto-art portfolio and storefront',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

const IPFS_ORIGIN = (() => {
  const base = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_IPFS_PROXY ?? '').replace(/\/$/, '') : ''
  return base ? new URL(base).origin : 'https://ipfs.io'
})()

const MEDIA_ORIGIN = (() => {
  const mediaBase = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? '').replace(/\/$/, '') : ''
  if (!mediaBase) return 'https://pub-71ed1655b8674186957a0405561cd60a.r2.dev'
  try {
    return new URL(mediaBase).origin
  } catch {
    return 'https://pub-71ed1655b8674186957a0405561cd60a.r2.dev'
  }
})()

const PRECONNECT_ORIGINS = Array.from(
  new Set([IPFS_ORIGIN, MEDIA_ORIGIN, 'https://ipfs.io', 'https://dweb.link'])
)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {PRECONNECT_ORIGINS.map((origin) => (
          <link key={`preconnect-${origin}`} rel="preconnect" href={origin} crossOrigin="" />
        ))}
        {PRECONNECT_ORIGINS.map((origin) => (
          <link key={`dns-prefetch-${origin}`} rel="dns-prefetch" href={origin} />
        ))}
      </head>
      <body className="bg-[#0a0a0a]">
        <AnimatedNoise />
        <div className="relative z-[200]">
          <MuseumNavigation />
          {children}
        </div>
      </body>
    </html>
  )
}
