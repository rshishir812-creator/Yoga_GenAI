/**
 * DisclaimerScreen — shown once before the first session.
 *
 * Must be accepted before user can proceed to health questionnaire.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  onAccept: () => void
  onDecline: () => void
  userName: string
}

export default function DisclaimerScreen({ onAccept, onDecline, userName }: Props) {
  const [checked, setChecked] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 px-4"
    >
      <div className="max-w-lg w-full rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-4xl">🙏</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Before We Begin{userName ? `, ${userName}` : ''}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Your safety is our priority
          </p>
        </div>

        {/* Disclaimer text */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 text-sm text-gray-700 dark:text-gray-300 space-y-3 max-h-64 overflow-y-auto">
          <p>
            <strong>This app provides AI-assisted yoga guidance</strong> and is not a substitute
            for professional medical advice, diagnosis, or treatment.
          </p>
          <p>
            If you have any medical conditions, injuries, or are pregnant, please consult your
            healthcare provider before starting any exercise programme.
          </p>
          <p>
            The safety system will ask about your health to personalise your experience and
            reduce risk, but it cannot replace professional supervision.
          </p>
          <p>
            <strong>You should stop immediately</strong> if you experience sharp pain, dizziness,
            chest tightness, or any unusual symptoms during practice.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            By proceeding, you acknowledge that you practice at your own risk and that
            the AI guidance is informational only.
          </p>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
            I understand that this app provides AI-assisted guidance and is not a substitute
            for professional medical advice. I agree to practice responsibly.
          </span>
        </label>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={onAccept}
            disabled={!checked}
            className="flex-1 py-3 px-4 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            I Agree — Continue
          </button>
        </div>
      </div>
    </motion.div>
  )
}
