/**
 * SessionBriefing — pre-session safety summary screen.
 *
 * Shows the filtered session plan with warnings, modifications, and
 * adjusted hold times before the user starts their practice.
 */
import { motion } from 'framer-motion'
import type { SessionPlan } from '../types/health'

interface Props {
  plan: SessionPlan
  onStart: () => void
  onBack: () => void
}

export default function SessionBriefing({ plan, onStart, onBack }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 px-4 py-8"
    >
      <div className="max-w-lg w-full rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-3xl">📋</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Your Session Plan
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {plan.poses.length} poses · ~{plan.estimated_duration_minutes} min
          </p>
        </div>

        {/* Warnings */}
        {plan.warnings.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 space-y-2">
            {plan.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                <span className="mt-0.5">⚠️</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pose list */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {plan.poses.map((pose, i) => (
            <div
              key={pose.pose_id + i}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50"
            >
              <span className="text-lg font-bold text-gray-300 dark:text-gray-500 w-6 text-center">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {pose.name_en}
                  </span>
                  {pose.is_substituted && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                      substituted
                    </span>
                  )}
                </div>
                {pose.modification && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                    ✏️ {pose.modification}
                  </p>
                )}
                {pose.advisory && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    ⚠️ {pose.advisory}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {pose.hold_seconds}s
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onBack}
            className="py-2.5 px-5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
          <button
            onClick={onStart}
            className="flex-1 py-2.5 px-5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors"
          >
            Begin Practice 🧘
          </button>
        </div>
      </div>
    </motion.div>
  )
}
