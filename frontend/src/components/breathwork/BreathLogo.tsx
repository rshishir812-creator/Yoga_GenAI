import { useEffect, useMemo, useRef } from 'react'
import type { BreathworkPhase } from '../../api/client'

type BreathLogoProps = {
  phase: BreathworkPhase
  phaseProgress: number
  logoPath: string
}

function phaseColor(phase: BreathworkPhase) {
  if (phase.animation === 'expand') return 'rgba(79, 209, 197, 0.82)'
  if (phase.animation === 'hold') return 'rgba(99, 102, 241, 0.82)'
  return 'rgba(45, 27, 105, 0.82)'
}

function nextScale(phase: BreathworkPhase, phaseProgress: number, nowMs: number) {
  const progress = Math.max(0, Math.min(1, phaseProgress))
  if (phase.animation === 'expand') return 0.72 + progress * 0.58
  if (phase.animation === 'hold') return 1.3 + Math.sin(nowMs / 800) * 0.015
  if (phase.animation === 'contract') return 1.3 - progress * 0.58
  return 1
}

export default function BreathLogo({ phase, phaseProgress, logoPath }: BreathLogoProps) {
  const scaleRef = useRef<HTMLDivElement | null>(null)

  const color = useMemo(() => phaseColor(phase), [phase])

  useEffect(() => {
    const node = scaleRef.current
    if (!node) return

    const next = nextScale(phase, phaseProgress, Date.now())
    node.style.setProperty('--breath-scale', String(next))
  }, [phase, phaseProgress])

  const circumference = 2 * Math.PI * 140
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, phaseProgress)))

  return (
    <div className="relative flex items-center justify-center">
      <div
        className="absolute h-[310px] w-[310px] rounded-full border border-teal-200/30"
        style={{
          animation: 'ripple 2.4s ease-out infinite',
          animationPlayState: phase.animation === 'hold' ? 'paused' : 'running',
        }}
      />

      <div
        className="absolute h-[248px] w-[248px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
          filter: 'blur(20px)',
          opacity: 0.62,
        }}
      />

      <svg className="absolute h-[318px] w-[318px] -rotate-90" viewBox="0 0 320 320">
        <circle cx="160" cy="160" r="140" stroke="rgba(255,255,255,0.09)" strokeWidth="5" fill="none" />
        <circle
          cx="160"
          cy="160"
          r="140"
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 120ms linear, stroke 200ms ease' }}
        />
      </svg>

      <div
        ref={scaleRef}
        className="relative flex h-[228px] w-[228px] items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5"
        style={{
          transform: 'scale(var(--breath-scale, 1))',
          transition: phase.animation === 'hold' ? 'none' : 'transform 80ms linear',
          boxShadow: `0 0 48px ${color}`,
        }}
      >
        <img src={logoPath} alt="OorjaKull logo" className="h-full w-full object-cover" />
      </div>
    </div>
  )
}
