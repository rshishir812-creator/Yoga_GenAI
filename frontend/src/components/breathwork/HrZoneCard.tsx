type HrZoneCardProps = {
  bpm: number
  sessionProgress: number
}

function zoneFromBpm(bpm: number) {
  if (bpm < 70) return 'Resting'
  if (bpm <= 85) return 'Relaxed'
  if (bpm <= 100) return 'Stimulated'
  return 'Elevated'
}

export default function HrZoneCard({ bpm, sessionProgress }: HrZoneCardProps) {
  const zone = zoneFromBpm(bpm)
  const barA = 22 + Math.round((bpm % 18) * 1.4)
  const barB = 18 + Math.round((bpm % 14) * 1.6)

  return (
    <div className="w-[min(300px,calc(100vw-1.5rem))] rounded-3xl border border-white/10 bg-white/[0.05] p-4 text-white/90 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">HR Zone</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xl">❤</span>
            <span className="text-2xl font-semibold tabular-nums">{bpm}</span>
            <span className="pt-1 text-xs text-white/55">BPM</span>
          </div>
          <p className="mt-1 text-sm text-teal-200">{zone}</p>
        </div>

        <div className="flex items-end gap-2 pt-1">
          <div className="w-2 rounded-full bg-teal-300/80" style={{ height: `${barA}px` }} />
          <div className="w-2 rounded-full bg-indigo-300/70" style={{ height: `${barB}px` }} />
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-300 via-cyan-300 to-indigo-400 transition-all duration-300"
          style={{ width: `${Math.max(8, sessionProgress * 100)}%` }}
        />
      </div>
    </div>
  )
}
