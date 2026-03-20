import { useEffect, useRef } from 'react'
import type { BreathworkPhase } from '../../api/client'

type BreathWaveBackgroundProps = {
  phase: BreathworkPhase
  phaseProgress: number
}

function amplitudeForPhase(phase: BreathworkPhase, phaseProgress: number, nowMs: number) {
  const progress = Math.max(0, Math.min(1, phaseProgress))

  if (phase.animation === 'expand') {
    return 8 + progress * (48 - 8)
  }
  if (phase.animation === 'hold') {
    return 48 + Math.sin(nowMs / 420) * 2
  }
  if (phase.animation === 'contract') {
    return 48 - progress * (48 - 8)
  }
  return 26
}

function speedForPhase(phase: BreathworkPhase, phaseProgress: number) {
  const progress = Math.max(0, Math.min(1, phaseProgress))

  if (phase.animation === 'expand') {
    return 0.55 + progress * 0.22
  }
  if (phase.animation === 'hold') {
    return 0.08
  }
  if (phase.animation === 'contract') {
    return 0.35 - progress * 0.2
  }
  return 0.3
}

export default function BreathWaveBackground({ phase, phaseProgress }: BreathWaveBackgroundProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const phaseRef = useRef(phase)
  const progressRef = useRef(phaseProgress)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    progressRef.current = phaseProgress
  }, [phaseProgress])

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let waveOffset = 0

    const resize = () => {
      const rect = root.getBoundingClientRect()
      width = Math.max(1, Math.floor(rect.width))
      height = Math.max(1, Math.floor(rect.height))
      dpr = Math.max(1, window.devicePixelRatio || 1)

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawWave = (
      offsetY: number,
      amplitude: number,
      phaseShift: number,
      alpha: number,
      lineWidth: number,
      nowMs: number,
    ) => {
      const centerY = height * 0.52 + offsetY
      const wavelength = Math.max(180, width * 0.55)

      const gradient = ctx.createLinearGradient(0, 0, width, 0)
      gradient.addColorStop(0, `rgba(79,209,197,${alpha})`)
      gradient.addColorStop(1, `rgba(99,102,241,${alpha})`)

      const drawPath = () => {
        ctx.beginPath()
        for (let x = 0; x <= width; x += 2) {
          const y = centerY + Math.sin(((x + waveOffset) / wavelength) * Math.PI * 2 + phaseShift) * amplitude
          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
      }

      ctx.save()
      ctx.lineWidth = lineWidth
      ctx.strokeStyle = gradient
      ctx.shadowBlur = 20
      ctx.shadowColor = 'rgba(79,209,197,0.7)'
      drawPath()
      ctx.stroke()
      ctx.restore()

      ctx.save()
      ctx.lineWidth = lineWidth
      ctx.strokeStyle = gradient
      drawPath()
      ctx.stroke()
      ctx.restore()

      // tiny moving highlight
      ctx.save()
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.12})`
      const pulseX = ((nowMs * 0.04) % width + width) % width
      ctx.beginPath()
      ctx.arc(pulseX, centerY, 1.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const render = (now: number) => {
      const currentPhase = phaseRef.current
      const currentProgress = progressRef.current
      const amplitude = amplitudeForPhase(currentPhase, currentProgress, now)
      const speed = speedForPhase(currentPhase, currentProgress)
      waveOffset += speed

      ctx.clearRect(0, 0, width, height)

      drawWave(-16, amplitude, 0, 1, 3, now)
      drawWave(0, amplitude * 0.72, 0.3, 0.4, 1.5, now)
      drawWave(14, amplitude * 0.5, 0.6, 0.15, 1, now)

      rafRef.current = window.requestAnimationFrame(render)
    }

    resize()

    const observer = new ResizeObserver(() => resize())
    observer.observe(root)
    window.addEventListener('orientationchange', resize)

    rafRef.current = window.requestAnimationFrame(render)

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
      }
      observer.disconnect()
      window.removeEventListener('orientationchange', resize)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0"
      style={{
        background:
          'radial-gradient(circle at 50% 50%, #0d0d0f 0%, #0a0b14 45%, #050714 100%)',
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <svg className="absolute inset-0 h-full w-full opacity-[0.03]" aria-hidden="true">
        <defs>
          <filter id="breath-noise-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#breath-noise-filter)" />
      </svg>
    </div>
  )
}
