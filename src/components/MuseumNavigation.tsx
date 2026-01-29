'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

export function MuseumNavigation() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'ARCHIVE', code: 'HOME' },
    { href: '/gallery', label: 'GALLERY', code: 'VIEW' },
    { href: '/collect', label: 'COLLECT', code: 'ACQ' },
    { href: '/drops', label: 'DROPS', code: 'EXH' },
  ]

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
      aria-label="Navigation"
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-start justify-between max-w-7xl mx-auto">
          {/* Museum placard style navigation */}
          <div className="flex flex-col gap-1 pointer-events-auto">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href || (item.href === '/' && pathname === '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative"
                >
                  <motion.div
                    className="flex items-baseline gap-2 mono text-xs"
                    whileHover={{ x: 2 }}
                  >
                    <span className="text-[#666] group-hover:text-[#888] transition-colors">
                      [{item.code}]
                    </span>
                    <span
                      className={`transition-colors ${
                        isActive
                          ? 'text-white font-medium'
                          : 'text-[#999] group-hover:text-white'
                      }`}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.span
                        className="text-[#666]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        ▋
                      </motion.span>
                    )}
                  </motion.div>
                </Link>
              )
            })}
          </div>

          {/* Terminal-style info */}
          <div className="text-right pointer-events-auto">
            <div className="mono text-xs text-[#666]">
              <div>RASCAL_ART</div>
              <div className="text-[#444]">v1.0</div>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}

