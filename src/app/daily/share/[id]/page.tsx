import { notFound } from 'next/navigation'
import { getAllDailies, getDailyById } from '@/lib/data'
import type { Metadata } from 'next'

export function generateStaticParams() {
  const dailies = getAllDailies()
  return dailies.map((d) => ({ id: d.id }))
}

interface DailySharePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: DailySharePageProps): Promise<Metadata> {
  const { id } = await params
  const daily = getDailyById(id)

  if (!daily) {
    return { title: 'Not Found' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rascalx.xyz'
  const title = (daily.title || daily.id.replace(/_/g, ' ')).toUpperCase()
  const description = daily.description || `${title} — Rascal Everydays`
  // imageUrl is already resolved to the full R2 CDN URL by getDailyById
  const imageUrl = daily.imageUrl

  return {
    title: `${title} | RASCAL EVERYDAYS`,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${siteUrl.replace(/\/+$/, '')}/daily/share/${id}`,
      images: imageUrl
        ? [{ url: imageUrl, width: 1200, height: 1200, alt: title }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function DailySharePage({ params }: DailySharePageProps) {
  const { id } = await params
  const daily = getDailyById(id)

  if (!daily) {
    notFound()
  }

  const title = (daily.title || daily.id.replace(/_/g, ' ')).toUpperCase()
  const isVideo = daily.imageUrl.endsWith('.mp4') || daily.imageUrl.endsWith('.mov')

  return (
    <main className="page-root text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <h1 className="font-grotesk text-3xl md:text-4xl font-light mb-6">{title}</h1>
        {isVideo ? (
          <div className="relative aspect-square max-w-lg mx-auto mb-6 bg-[#111]">
            <video
              src={daily.imageUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="relative aspect-square max-w-lg mx-auto mb-6 bg-[#111]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={daily.imageUrl}
              alt={title}
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <p className="mono text-sm text-[#888] mb-2">RASCAL EVERYDAYS</p>
        <p className="mono text-xs text-[#666] mb-4">
          {new Date(daily.savedDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).toUpperCase()}
        </p>
        <a
          href="/"
          className="mono text-xs px-4 py-2 border border-[#222] hover:border-[#333] transition-colors inline-block"
        >
          VIEW ARCHIVE
        </a>
      </div>
    </main>
  )
}
