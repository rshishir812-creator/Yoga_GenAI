type VolumeToggleProps = {
  isMuted: boolean
  onToggle: () => void
}

export default function VolumeToggle({ isMuted, onToggle }: VolumeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex min-h-12 min-w-12 items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm text-white/90 backdrop-blur-xl transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
      aria-label={isMuted ? 'Unmute breathing audio' : 'Mute breathing audio'}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5L6 9H3V15H6L11 19V5Z" />
        {!isMuted && <path d="M15.5 8.5C17.5 10.5 17.5 13.5 15.5 15.5" />}
        {!isMuted && <path d="M18.5 6C21.8 9.3 21.8 14.7 18.5 18" />}
        {isMuted && <path d="M4 4L20 20" />}
      </svg>
      <span className="text-xs font-medium tracking-wide">{isMuted ? 'Muted' : 'Sound On'}</span>
    </button>
  )
}
