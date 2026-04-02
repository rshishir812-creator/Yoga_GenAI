import { AnimatePresence, motion } from 'framer-motion'
import type { BreathworkProtocol } from '../api/client'
import BreathworkIcon from './BreathworkIcons'

interface BreathworkInfoSheetProps {
  protocol: BreathworkProtocol | null
  onClose: () => void
  onBegin: (protocol: BreathworkProtocol) => void
}

export default function BreathworkInfoSheet({ protocol, onClose, onBegin }: BreathworkInfoSheetProps) {
  return (
    <AnimatePresence>
      {protocol && (
        <>
          <motion.button
            type="button"
            aria-label="Close breathwork details"
            className="fixed inset-0 z-[70] bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[80] mx-auto w-full max-w-2xl rounded-t-[32px] border border-white/10 bg-[#0f1216]/95 p-6 text-left text-white shadow-2xl backdrop-blur-xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
          >
            <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-white/15" />
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-400/30 via-cyan-400/15 to-teal-600/10 text-teal-200">
                <BreathworkIcon protocol={protocol} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-cinzel text-xl font-semibold tracking-[0.05em] text-white">
                      {protocol.name}
                    </p>
                    <p className="mt-1 text-sm text-teal-300/85">
                      {protocol.tagline}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/5"
                  >
                    Close
                  </button>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {protocol.description}
                </p>
                <p className="mt-3 text-sm text-slate-400">
                  <span className="text-slate-200">Origin:</span> {protocol.origin}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  <span className="text-slate-200">Difficulty:</span> {protocol.difficulty}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {protocol.benefits.map((benefit) => (
                    <span
                      key={benefit}
                      className="rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-xs font-medium text-teal-200"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onBegin(protocol)}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-black transition hover:from-teal-400 hover:to-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  Begin Session
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
