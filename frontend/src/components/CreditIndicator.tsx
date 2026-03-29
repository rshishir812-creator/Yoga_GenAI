type Props = {
  creditsRemaining: number | null
  isUnlimited: boolean
  /** Total credits (remaining + used) for summary display */
  creditsUsed?: number
  /** Compact mode (practice header) vs summary mode (landing toolbar) */
  variant?: 'compact' | 'summary'
}

/**
 * Small pill badge that shows remaining AI feedback credits.
 * Hidden for super_user / paid_user (unlimited) accounts.
 *
 * - variant="compact": "🔮 12 credits" (practice header)
 * - variant="summary": "🔮 12 / 20 credits used" (landing toolbar)
 */
export default function CreditIndicator({ creditsRemaining, isUnlimited, creditsUsed, variant = 'compact' }: Props) {
  // Don't render for unlimited users
  if (isUnlimited || creditsRemaining === null || creditsRemaining === undefined) {
    return null
  }

  const isLow = creditsRemaining <= 5
  const isEmpty = creditsRemaining <= 0
  const totalCredits = creditsUsed != null ? creditsRemaining + creditsUsed : null

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm
        ${isEmpty
          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
          : isLow
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
        }
      `}
      title={`${creditsRemaining} AI feedback credit${creditsRemaining === 1 ? '' : 's'} remaining`}
    >
      <span>{isEmpty ? '⚠️' : '🔮'}</span>
      <span>
        {isEmpty
          ? 'No credits'
          : variant === 'summary' && totalCredits != null
            ? `${creditsUsed} / ${totalCredits} used`
            : `${creditsRemaining} credit${creditsRemaining === 1 ? '' : 's'}`
        }
      </span>
    </div>
  )
}
