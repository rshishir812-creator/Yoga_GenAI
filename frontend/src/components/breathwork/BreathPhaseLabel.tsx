import { AnimatePresence, motion } from 'framer-motion'
import type { BreathworkPhase } from '../../api/client'

type BreathPhaseLabelProps = {
  phase: BreathworkPhase
  cycle: number
}

export default function BreathPhaseLabel({ phase, cycle }: BreathPhaseLabelProps) {
  return (
    <div className="w-full text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${cycle}-${phase.label}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mx-auto"
        >
          <h2
            className={phase.animation === 'hold' ? 'breath-hold-pulse' : ''}
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 300,
              fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
              lineHeight: 1,
              letterSpacing: '0.03em',
              color: 'rgba(255,255,255,0.95)',
              margin: 0,
            }}
          >
            {phase.label}
          </h2>

          <p
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)',
              color: 'rgba(255,255,255,0.45)',
              maxWidth: 280,
              margin: '12px auto 0',
            }}
          >
            {phase.instruction}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
