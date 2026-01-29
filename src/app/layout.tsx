import type { Metadata } from 'next'
import './globals.css'
import { MuseumNavigation } from '@/components/MuseumNavigation'

export const metadata: Metadata = {
  title: 'Rascal Art',
  description: 'Anonymous crypto-art portfolio and storefront',
  icons: {
    icon: '/disobedience-archive/favicon.ico',
    shortcut: '/disobedience-archive/favicon.ico',
    apple: '/disobedience-archive/apple-touch-icon.png',
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

