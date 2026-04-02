import { useEffect, useMemo, useRef } from 'react'
import type { BreathworkPhase } from '../../api/client'

type BreathLogoProps = {
  phase: BreathworkPhase
  phaseProgress: number
}

type MandalaPreset = {
  id: string
  petals: number
  stroke: string
  accent: string
  strokeWidth: number
}

const MANDALA_PRESETS: MandalaPreset[] = [
  { id: 'lotus-a', petals: 12, stroke: 'rgba(167, 139, 250, 0.55)', accent: 'rgba(255, 255, 255, 0.28)', strokeWidth: 1.8 },
  { id: 'lotus-b', petals: 16, stroke: 'rgba(45, 212, 191, 0.5)', accent: 'rgba(255, 255, 255, 0.24)', strokeWidth: 1.5 },
  { id: 'sun-c', petals: 10, stroke: 'rgba(251, 191, 36, 0.42)', accent: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1.9 },
  { id: 'moon-d', petals: 18, stroke: 'rgba(244, 114, 182, 0.42)', accent: 'rgba(255, 255, 255, 0.22)', strokeWidth: 1.35 },
  { id: 'calm-e', petals: 14, stroke: 'rgba(96, 165, 250, 0.45)', accent: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1.6 },
]

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

function pickRandomMandalas(count: number): MandalaPreset[] {
  const copy = [...MANDALA_PRESETS]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy.slice(0, Math.max(2, Math.min(3, count)))
}

function MandalaGlyph({ preset }: { preset: MandalaPreset }) {
  const center = 100
  const ringA = 28
  const ringB = 48
  const ringC = 68

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <circle cx={center} cy={center} r={ringC} stroke={preset.stroke} strokeWidth={preset.strokeWidth} fill="none" />
      <circle cx={center} cy={center} r={ringB} stroke={preset.accent} strokeWidth={preset.strokeWidth} fill="none" />
      <circle cx={center} cy={center} r={ringA} stroke={preset.stroke} strokeWidth={preset.strokeWidth * 0.9} fill="none" />

      {Array.from({ length: preset.petals }).map((_, index) => {
        const angle = (index / preset.petals) * Math.PI * 2
        const xA = center + Math.cos(angle) * ringA
        const yA = center + Math.sin(angle) * ringA
        const xB = center + Math.cos(angle) * ringB
        const yB = center + Math.sin(angle) * ringB
        const xC = center + Math.cos(angle) * ringC
        const yC = center + Math.sin(angle) * ringC

        return (
          <g key={`${preset.id}-${index}`}>
            <line x1={xA} y1={yA} x2={xC} y2={yC} stroke={preset.accent} strokeWidth={preset.strokeWidth * 0.75} />
            <circle cx={xB} cy={yB} r={2.4} fill={preset.stroke} />
            <circle cx={xC} cy={yC} r={1.5} fill={preset.accent} />
          </g>
        )
      })}

      <circle cx={center} cy={center} r={8} fill={preset.accent} />
    </svg>
  )
}

export default function BreathLogo({ phase, phaseProgress }: BreathLogoProps) {
  const scaleRef = useRef<HTMLDivElement | null>(null)

  const color = useMemo(() => phaseColor(phase), [phase])
  const mandalas = useMemo(() => pickRandomMandalas(3), [])
  const randomSeed = useMemo(() => Math.floor(Math.random() * 360), [])

  useEffect(() => {
    const node = scaleRef.current
    if (!node) return

    const next = nextScale(phase, phaseProgress, Date.now())
    node.style.setProperty('--breath-scale', String(next))
  }, [phase, phaseProgress])

  const progress = Math.max(0, Math.min(1, phaseProgress))
  const circumference = 2 * Math.PI * 140
  const dashOffset = circumference * (1 - progress)
  const direction = phase.animation === 'contract' ? -1 : 1

  return (
    <div className="relative flex flex-col items-center justify-center gap-4">
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
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 38%, transparent 74%)',
          }}
        />

        {mandalas.map((preset, idx) => {
          const rotate = randomSeed + direction * progress * (22 + idx * 14) + idx * 28
          const scale = 1 - idx * 0.14
          const opacity = 0.62 - idx * 0.14

          return (
            <div
              key={preset.id}
              className="absolute inset-[10%]"
              style={{
                transform: `rotate(${rotate}deg) scale(${scale})`,
                transition: 'transform 120ms linear',
                opacity,
              }}
            >
              <MandalaGlyph preset={preset} />
            </div>
          )
        })}
      </div>
      </div>

      <p className="font-cinzel text-[10px] uppercase tracking-[0.42em] text-white/50 sm:text-xs">
        OorjaKull
      </p>
    </div>
  )
}
