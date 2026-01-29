'use client'

import { motion } from 'framer-motion'

interface ArtifactMarkerProps {
  text: string
  index: number
}

export function ArtifactMarker({ text, index }: ArtifactMarkerProps) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03, duration: prefersReducedMotion ? 0 : 0.6 }}
      className="w-full mb-8 md:mb-12 py-6 md:py-8 border-t border-b border-[#222]"
    >
      <div className="mono text-[10px] text-[#555] tracking-[0.3em] text-center">
        {text}
      </div>
    </motion.div>
  )
}

