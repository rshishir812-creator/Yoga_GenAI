/**
 * RiskWarningBanner — escalation UI overlay.
 *
 * Shown when the real-time risk score exceeds warn/pause/stop thresholds.
 * Displays a trainer-voice message and action buttons.
 */
import { motion } from 'framer-motion'
import type { EscalationEvent } from '../types/health'

interface Props {
  event: EscalationEvent
  onDismiss: () => void
  onPause: () => void
  onStop: () => void
}

const LEVEL_STYLES: Record<string, { bg: string; border: string; icon: string; title: string }> = {
  warn: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-300 dark:border-amber-700',
    icon: '⚠️',
    title: 'Gentle Reminder',
  },
  pause: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    border: 'border-orange-400 dark:border-orange-700',
    icon: '⏸️',
    title: 'Let\'s Take a Moment',
  },
  stop: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-400 dark:border-red-700',
    icon: '🛑',
    title: 'Time to Rest',
  },
}

export default function RiskWarningBanner({ event, onDismiss, onPause, onStop }: Props) {
  const style = LEVEL_STYLES[event.event_type] ?? LEVEL_STYLES.warn

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[95vw] rounded-2xl border-2 ${style.bg} ${style.border} shadow-2xl p-5`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">{style.icon}</span>
        <div className="flex-1 space-y-2">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">
            {style.title}
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {event.reason}
          </p>

          <div className="flex gap-2 pt-1">
            {event.event_type === 'warn' && (
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Got it
              </button>
            )}
            {(event.event_type === 'warn' || event.event_type === 'pause') && (
              <button
                onClick={onPause}
                className="px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/40 text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-200 transition-colors"
              >
                Pause Session
              </button>
            )}
            {event.event_type === 'stop' && (
              <button
                onClick={onStop}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-xs font-medium text-white hover:bg-red-700 transition-colors"
              >
                End Session Safely
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
