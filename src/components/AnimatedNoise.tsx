'use client'

import { useEffect, useRef } from 'react'

export function AnimatedNoise() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    // Set canvas size to match viewport (scale down for performance)
    const resizeCanvas = () => {
      // Use smaller resolution for better performance, browser will scale it
      canvas.width = Math.floor(window.innerWidth / 2)
      canvas.height = Math.floor(window.innerHeight / 2)
      canvas.style.width = '100%'
      canvas.style.height = '100%'
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Pre-allocate image data
    let imageData = ctx.createImageData(canvas.width, canvas.height)
    const data = imageData.data

    const animate = () => {
      // Generate new noise each frame - optimized
      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 255
        const value = Math.floor(noise * 0.06) // Reduced intensity for subtle grain
        data[i] = value     // R
        data[i + 1] = value // G
        data[i + 2] = value // B
        data[i + 3] = 255   // A
      }
      
      ctx.putImageData(imageData, 0, 0)
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-[100] mix-blend-mode-screen opacity-100"
      style={{ imageRendering: 'pixelated', opacity: 0.25 }}
    />
  )
}
