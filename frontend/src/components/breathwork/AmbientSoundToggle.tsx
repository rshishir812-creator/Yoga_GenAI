import type { AmbientMode } from '../../hooks/useBreathAudio'

type AmbientSoundToggleProps = {
  mode: AmbientMode
  onToggle: () => void
}

const MODE_LABEL: Record<AmbientMode, string> = {
  off: 'Ambient Off',
  rain: 'Rain',
  ocean: 'Ocean',
  om: 'Om Drone',
}

export default function AmbientSoundToggle({ mode, onToggle }: AmbientSoundToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex min-h-12 min-w-12 items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm text-white/90 backdrop-blur-xl transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
      aria-label={`Ambient soundscape: ${MODE_LABEL[mode]}`}
      title="Cycle ambient soundscape"
    >
      <span aria-hidden="true" className="text-sm">◌</span>
      <span className="text-xs font-medium tracking-wide">{MODE_LABEL[mode]}</span>
    </button>
  )
}
