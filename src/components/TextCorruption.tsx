'use client'

import { useEffect } from 'react'

const CORRUPTION_SYMBOLS = ['█', '▓', '▒', '░', '▄', '▀', '▌', '▐', '■', '□', '▪', '▫', '●', '○', '◆', '◇', '▲', '△', '▼', '▽', '◊', '◈', '◉', '◯', '◐', '◑', '◒', '◓', '◔', '◕', '◖', '◗', '◘', '◙', '◚', '◛', '◜', '◝', '◞', '◟', '◠', '◡', '◢', '◣', '◤', '◥', '◦', '◧', '◨', '◩', '◪', '◫', '◬', '◭', '◮', '◯', '◰', '◱', '◲', '◳', '◴', '◵', '◶', '◷', '◸', '◹', '◺', '◻', '◼', '◽', '◾', '◿']

export function TextCorruption() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const corruptText = () => {
      // Get ALL text nodes in the document - site-wide corruption
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement
            if (!parent) return NodeFilter.FILTER_REJECT
            // Skip script, style, and elements with data-no-corrupt
            if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return NodeFilter.FILTER_REJECT
            if (parent.hasAttribute('data-no-corrupt')) return NodeFilter.FILTER_REJECT
            // Skip navigation
            if (parent.closest('nav')) return NodeFilter.FILTER_REJECT
            // Must have text content
            const text = node.textContent || ''
            if (text.trim().length < 1) return NodeFilter.FILTER_REJECT
            // Check if parent is visible
            const style = window.getComputedStyle(parent)
            if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT
            return NodeFilter.FILTER_ACCEPT
          }
        }
      )

      const textNodes: Text[] = []
      let node
      while (node = walker.nextNode()) {
        textNodes.push(node as Text)
      }

      if (textNodes.length === 0) return

      // Pick 6-12 random text nodes to corrupt (more aggressive)
      const selected = textNodes
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(12, Math.floor(Math.random() * 7) + 6))

      const corruptions: Array<{ node: Text; originalText: string }> = []

      selected.forEach((textNode) => {
        const text = textNode.textContent || ''
        if (text.length < 1) return

        // Pick 1-4 random character positions to corrupt
        const indices: number[] = []
        const numCorruptions = Math.min(4, Math.floor(Math.random() * 4) + 1)
        
        // Find alphanumeric characters
        const alphanumericIndices: number[] = []
        for (let i = 0; i < text.length; i++) {
          if (/[A-Za-z0-9]/.test(text[i])) {
            alphanumericIndices.push(i)
          }
        }

        if (alphanumericIndices.length === 0) return

        // Pick random indices
        const shuffled = [...alphanumericIndices].sort(() => Math.random() - 0.5)
        for (let i = 0; i < Math.min(numCorruptions, shuffled.length); i++) {
          indices.push(shuffled[i])
        }

        if (indices.length === 0) return

        // Store original
        const originalText = text
        corruptions.push({ node: textNode, originalText })

        // Corrupt the characters
        let corruptedText = text.split('')
        indices.forEach((index) => {
          corruptedText[index] = CORRUPTION_SYMBOLS[Math.floor(Math.random() * CORRUPTION_SYMBOLS.length)]
        })
        textNode.textContent = corruptedText.join('')
      })

      // Restore after a short time
      if (corruptions.length > 0) {
        setTimeout(() => {
          corruptions.forEach(({ node, originalText }) => {
            node.textContent = originalText
          })
        }, 300 + Math.random() * 500) // 300-800ms
      }
    }

    const glitchSpacing = () => {
      // Get text elements
      const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a, li')
      const elementsToGlitch: HTMLElement[] = []

      textElements.forEach((el) => {
        const htmlEl = el as HTMLElement
        if (htmlEl.hasAttribute('data-no-corrupt')) return
        if (htmlEl.closest('script, style')) return
        const style = window.getComputedStyle(htmlEl)
        if (style.display === 'none' || style.visibility === 'hidden') return
        if (htmlEl.textContent && htmlEl.textContent.trim().length > 2) {
          elementsToGlitch.push(htmlEl)
        }
      })

      if (elementsToGlitch.length === 0) return

      // Pick 2-4 elements
      const selected = elementsToGlitch
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(4, Math.floor(Math.random() * 3) + 2))

      const glitches: Array<{ element: HTMLElement; originalLetterSpacing: string; originalWordSpacing: string }> = []

      selected.forEach((element) => {
        const originalLetterSpacing = element.style.letterSpacing
        const originalWordSpacing = element.style.wordSpacing
        glitches.push({ element, originalLetterSpacing, originalWordSpacing })

        // Glitch spacing
        const letterSpacing = (Math.random() * 0.1 - 0.05).toFixed(2) + 'em' // -0.05em to 0.05em
        const wordSpacing = (Math.random() * 0.2 - 0.1).toFixed(2) + 'em' // -0.1em to 0.1em
        element.style.letterSpacing = letterSpacing
        element.style.wordSpacing = wordSpacing
      })

      // Restore after short time
      setTimeout(() => {
        glitches.forEach(({ element, originalLetterSpacing, originalWordSpacing }) => {
          element.style.letterSpacing = originalLetterSpacing
          element.style.wordSpacing = originalWordSpacing
        })
      }, 200 + Math.random() * 300) // 200-500ms
    }

    const glitchDivSizes = () => {
      // Get divs and containers
      const divs = document.querySelectorAll('div, section, article, main, header, footer, nav')
      const divsToGlitch: HTMLElement[] = []

      divs.forEach((el) => {
        const htmlEl = el as HTMLElement
        if (htmlEl.hasAttribute('data-no-corrupt')) return
        if (htmlEl.closest('script, style')) return
        const style = window.getComputedStyle(htmlEl)
        if (style.display === 'none' || style.visibility === 'hidden') return
        // Only glitch if it has some content
        if (htmlEl.children.length > 0 || (htmlEl.textContent && htmlEl.textContent.trim().length > 0)) {
          divsToGlitch.push(htmlEl)
        }
      })

      if (divsToGlitch.length === 0) return

      // Pick 1-3 divs
      const selected = divsToGlitch
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(3, Math.floor(Math.random() * 3) + 1))

      const glitches: Array<{ element: HTMLElement; originalTransform: string; originalScale: string }> = []

      selected.forEach((element) => {
        const originalTransform = element.style.transform
        const originalScale = element.style.scale || ''
        glitches.push({ element, originalTransform, originalScale })

        // Glitch scale slightly
        const scale = (0.98 + Math.random() * 0.04).toFixed(3) // 0.98 to 1.02
        element.style.transform = `scale(${scale})`
        element.style.transition = 'transform 0.1s ease-out'
      })

      // Restore after short time
      setTimeout(() => {
        glitches.forEach(({ element, originalTransform, originalScale }) => {
          element.style.transform = originalTransform
          element.style.scale = originalScale
          element.style.transition = ''
        })
      }, 150 + Math.random() * 200) // 150-350ms
    }

    // Corrupt text more frequently - start immediately and then repeat
    corruptText() // Run once immediately
    const textInterval = setInterval(() => {
      corruptText() // Always run, no random check
    }, 1500 + Math.random() * 1500) // 1.5-3 seconds (more frequent)

    // Glitch spacing
    const spacingInterval = setInterval(() => {
      if (Math.random() > 0.3) { // 70% chance
        glitchSpacing()
      }
    }, 3000 + Math.random() * 4000) // 3-7 seconds

    // Glitch div sizes
    const divInterval = setInterval(() => {
      if (Math.random() > 0.4) { // 60% chance
        glitchDivSizes()
      }
    }, 4000 + Math.random() * 5000) // 4-9 seconds

    return () => {
      clearInterval(textInterval)
      clearInterval(spacingInterval)
      clearInterval(divInterval)
    }
  }, [])

  return null
}

