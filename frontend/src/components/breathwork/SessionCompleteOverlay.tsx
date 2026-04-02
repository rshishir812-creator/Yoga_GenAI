import { motion } from 'framer-motion'
import type { BreathworkProtocol } from '../../api/client'

type SessionCompleteOverlayProps = {
  protocol: BreathworkProtocol
  totalCycles: number
  elapsedSeconds: number
  onDone: () => void
}

function affirmationForProtocol(protocol: BreathworkProtocol) {
  const category = protocol.category.toLowerCase()

  if (category.includes('focus') || category.includes('clarity')) {
    return 'Clarity found.'
  }
  if (protocol.difficulty === 'advanced') {
    return 'Awake and alive.'
  }
  if (protocol.difficulty === 'beginner') {
    return 'Your nervous system is grateful.'
  }
  return 'You are centered and steady.'
}

function quoteForProtocol(protocol: BreathworkProtocol) {
  const quotes = [
    'Breath is the bridge between body and awareness.',
    'Slow breath, steady mind, strong presence.',
    'Regulate the breath, and the rest follows.',
    'Your pace is your power.',
  ]

  const seed = protocol.id.length + protocol.name.length + protocol.duration_mins
  return quotes[seed % quotes.length]
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function SessionCompleteOverlay({
  protocol,
  totalCycles,
  elapsedSeconds,
  onDone,
}: SessionCompleteOverlayProps) {
  const handleShare = async () => {
    const summary = `I just completed ${protocol.duration_mins} min of ${protocol.name} on OorjaKull 🧘`
    try {
      await navigator.clipboard.writeText(summary)
    } catch {
      // no-op
    }
  }

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_center,#0d0d0f_0%,#050714_100%)] px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center backdrop-blur-xl"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <img
          src={`${import.meta.env.BASE_URL}Logo.jpeg`}
          alt="OorjaKull"
          className="mx-auto h-12 w-12 rounded-xl border border-white/15 object-cover"
        />

        <p className="mt-2 font-cinzel text-[10px] uppercase tracking-[0.38em] text-teal-200/80">OorjaKull</p>

        <h2
          className="mt-4 text-white"
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 300,
            fontSize: 'clamp(2rem, 8vw, 3rem)',
            lineHeight: 1.05,
          }}
        >
          {protocol.name}
        </h2>

        <p className="mt-3 text-sm text-white/65">
          {totalCycles} cycles · {formatDuration(elapsedSeconds)}
        </p>

        <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/45">
          {protocol.difficulty}
        </p>

        <p
          className="mt-5 text-white/90"
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 'clamp(1rem, 3.4vw, 1.3rem)',
          }}
        >
          {affirmationForProtocol(protocol)}
        </p>

        <p className="mt-3 text-sm text-teal-100/85">“{quoteForProtocol(protocol)}”</p>

        <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
          Powered by OorjaKull AI
        </p>

        <button
          type="button"
          onClick={() => {
            void handleShare()
          }}
          className="mt-6 w-full rounded-2xl border border-white/20 bg-black/30 px-4 py-3 text-xs font-medium tracking-[0.15em] text-white/90 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          SHARE SESSION
        </button>

        <button
          type="button"
          onClick={onDone}
          className="mt-3 w-full rounded-2xl border border-teal-300/40 bg-teal-300/10 px-4 py-3 text-sm font-medium text-teal-100 transition hover:bg-teal-300/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          Done
        </button>
      </motion.div>
    </motion.div>
  )
}
