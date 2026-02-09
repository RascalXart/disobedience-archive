import type { Metadata } from 'next'
import './globals.css'
import { MuseumNavigation } from '@/components/MuseumNavigation'
import { AnimatedNoise } from '@/components/AnimatedNoise'

// Favicon configuration - use absolute paths for production
// Next.js static export handles public folder assets at root
export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href={IPFS_ORIGIN} />
        <link rel="dns-prefetch" href={IPFS_ORIGIN} />
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

