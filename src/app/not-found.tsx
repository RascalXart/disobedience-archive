import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center pt-24">
      <div className="text-center">
        <div className="mono text-xs text-[#666] mb-4 tracking-wider">
          [ERROR_404]
        </div>
        <h1 className="font-grotesk text-6xl md:text-8xl font-light mb-6 tracking-tighter">
          404
        </h1>
        <p className="mono text-sm text-[#888] mb-8">ENTRY NOT FOUND</p>
        <Link
          href="/"
          className="mono text-xs px-6 py-3 border border-[#222] hover:border-[#333] transition-colors inline-block"
        >
          [RETURN_TO_ARCHIVE]
        </Link>
      </div>
    </main>
  )
}
