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
  const hrEffect = protocol.effects.hr

  if (category.includes('focus') || category.includes('clarity')) {
    return 'Clarity found.'
  }
  if (hrEffect === 'increase') {
    return 'Awake and alive.'
  }
  if (hrEffect === 'decrease') {
    return 'Your nervous system is grateful.'
  }
  return 'You are centered and steady.'
}

export default function SessionCompleteOverlay({
  protocol,
  totalCycles,
  elapsedSeconds,
  onDone,
}: SessionCompleteOverlayProps) {
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
        <h2
          className="text-white"
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
          {totalCycles} cycles · {elapsedSeconds}s
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

        <button
          type="button"
          onClick={onDone}
          className="mt-7 w-full rounded-2xl border border-teal-300/40 bg-teal-300/10 px-4 py-3 text-sm font-medium text-teal-100 transition hover:bg-teal-300/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          Done
        </button>
      </motion.div>
    </motion.div>
  )
}
