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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a]">
        <AnimatedNoise />
        <MuseumNavigation />
        {children}
      </body>
    </html>
  )
}

