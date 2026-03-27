/**
 * PainCheckButton — floating button shown during evaluation phase.
 *
 * Tap to report pain. Opens a small popover with level selection.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  onReport: (level: 'mild' | 'moderate' | 'severe') => void
  className?: string
}

const LEVELS: { value: 'mild' | 'moderate' | 'severe'; emoji: string; label: string; color: string }[] = [
  { value: 'mild',     emoji: '🟡', label: 'Mild',     color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' },
  { value: 'moderate', emoji: '🟠', label: 'Moderate', color: 'bg-orange-100 hover:bg-orange-200 text-orange-800' },
  { value: 'severe',   emoji: '🔴', label: 'Severe',   color: 'bg-red-100 hover:bg-red-200 text-red-800' },
]

export default function PainCheckButton({ onReport, className = '' }: Props) {
  const [open, setOpen] = useState(false)

  function handleSelect(level: 'mild' | 'moderate' | 'severe') {
    onReport(level)
    setOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold shadow-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        title="Report pain or discomfort"
      >
        <span className="text-base">🔴</span>
        <span>Pain?</span>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full mb-2 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 p-3 min-w-[180px] z-50"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
              How's the discomfort?
            </p>
            <div className="space-y-1.5">
              {LEVELS.map(({ value, emoji, label, color }) => (
                <button
                  key={value}
                  onClick={() => handleSelect(value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${color}`}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
