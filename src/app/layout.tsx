import type { Metadata } from 'next'
import './globals.css'
import { MuseumNavigation } from '@/components/MuseumNavigation'

// Favicon paths - Next.js will handle basePath automatically in production
// In dev mode, basePath is empty so /favicon.ico works
export const metadata: Metadata = {
  title: 'Rascal Art',
  description: 'Anonymous crypto-art portfolio and storefront',
  icons: {
    icon: '/favicon.ico',
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
        <MuseumNavigation />
        {children}
      </body>
    </html>
  )
}

