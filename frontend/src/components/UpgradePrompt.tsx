import { motion } from 'framer-motion'

type Props = {
  onDismiss: () => void
}

/**
 * Overlay shown when a free-tier user has exhausted all their credits.
 * Encourages them to upgrade for continued AI feedback.
 */
export default function UpgradePrompt({ onDismiss }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="mx-4 max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-800"
      >
        {/* Icon */}
        <div className="mb-4 text-center text-5xl">✨</div>

        <h2 className="mb-2 text-center text-xl font-bold text-slate-900 dark:text-slate-100">
          Credits Exhausted
        </h2>

        <p className="mb-4 text-center text-sm text-slate-600 dark:text-slate-400">
          You've used all <strong>20 free AI feedback credits</strong>. Your deterministic
          pose scoring and breathwork sessions remain fully available — no limits.
        </p>

        <div className="mb-6 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-4 dark:from-indigo-900/30 dark:to-purple-900/30">
          <h3 className="mb-2 text-sm font-semibold text-indigo-800 dark:text-indigo-300">
            What you still get for free:
          </h3>
          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <li>✅ Real-time deterministic pose scoring</li>
            <li>✅ All breathwork protocols & sessions</li>
            <li>✅ Pose reference library & instructions</li>
            <li>✅ Voice-guided framing & prompts</li>
          </ul>
        </div>

        <p className="mb-5 text-center text-sm text-slate-600 dark:text-slate-400">
          To unlock <strong>unlimited AI-powered corrections</strong>, contact us about upgrading
          your account.
        </p>

        <button
          onClick={onDismiss}
          className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700 active:scale-[0.98]"
        >
          Got it — continue practising
        </button>
      </motion.div>
    </motion.div>
  )
}
