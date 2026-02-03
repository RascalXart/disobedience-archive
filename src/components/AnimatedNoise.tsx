'use client'

import { useEffect, useRef } from 'react'

export function AnimatedNoise() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const noiseSizeRef = useRef({ width: 0, height: 0 })
  const transformRef = useRef({ rotation: 0, flipX: false, flipY: false })
  const lastUpdateRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return
    
    // Disable image smoothing for nearest neighbor scaling (pixelated look)
    ctx.imageSmoothingEnabled = false

    // Set canvas size to match viewport (full size for display)
    const resizeCanvas = () => {
      // Canvas is full viewport size for display
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.imageRendering = 'pixelated' // Ensure pixels stay crisp when scaled
      
      // Regenerate static noise when resizing
      offscreenCanvasRef.current = null
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Generate static noise texture once on offscreen canvas (much smaller)
    const generateStaticNoise = () => {
      // Noise texture is much smaller - will be scaled up to make pixels bigger
      const noiseWidth = Math.floor(window.innerWidth / 10)
      const noiseHeight = Math.floor(window.innerHeight / 10)
      
      if (offscreenCanvasRef.current && 
          noiseSizeRef.current.width === noiseWidth && 
          noiseSizeRef.current.height === noiseHeight) {
        return // Already generated for this size
      }
      
      // Create offscreen canvas for the static noise (much smaller)
      const offscreenCanvas = document.createElement('canvas')
      offscreenCanvas.width = noiseWidth
      offscreenCanvas.height = noiseHeight
      const offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false })
      if (!offscreenCtx) return
      
      // Disable image smoothing for nearest neighbor scaling
      offscreenCtx.imageSmoothingEnabled = false
      
      const imageData = offscreenCtx.createImageData(noiseWidth, noiseHeight)
      const data = imageData.data
      
      // Generate noise once
      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 255
        const value = Math.floor(noise * 0.06) // Reduced intensity for subtle grain
        data[i] = value     // R
        data[i + 1] = value // G
        data[i + 2] = value // B
        data[i + 3] = 255   // A
      }
      
      // Put the noise data onto the offscreen canvas
      offscreenCtx.putImageData(imageData, 0, 0)
      offscreenCanvasRef.current = offscreenCanvas
      noiseSizeRef.current = { width: noiseWidth, height: noiseHeight }
    }

    generateStaticNoise()

    const animate = (timestamp: number) => {
      // Update transform every ~500ms instead of every frame
      if (timestamp - lastUpdateRef.current > 500) {
        // Randomly change rotation (0, 90, 180, 270 degrees)
        transformRef.current.rotation = Math.floor(Math.random() * 4) * 90
        
        // Randomly flip
        transformRef.current.flipX = Math.random() > 0.5
        transformRef.current.flipY = Math.random() > 0.5
        
        lastUpdateRef.current = timestamp
      }

      // Clear and apply transforms
      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Center for rotation
      ctx.translate(canvas.width / 2, canvas.height / 2)
      
      // Apply rotation
      ctx.rotate((transformRef.current.rotation * Math.PI) / 180)
      
      // Apply flips
      ctx.scale(
        transformRef.current.flipX ? -1 : 1,
        transformRef.current.flipY ? -1 : 1
      )
      
      // Draw static noise from offscreen canvas (drawImage respects transforms)
      // Scale up to fill the canvas, making pixels bigger
      if (offscreenCanvasRef.current) {
        // Scale up to fill canvas (noise is 1/10 size, so drawing at full canvas size scales it 10x)
        ctx.drawImage(
          offscreenCanvasRef.current,
          -canvas.width / 2,
          -canvas.height / 2,
          canvas.width,
          canvas.height
        )
      }
      
      ctx.restore()
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

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
