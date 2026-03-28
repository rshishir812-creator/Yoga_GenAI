import { useMemo } from 'react'
import { motion } from 'framer-motion'
import PoseCard from './PoseCard'
import type { PoseSequence } from '../data/sequences'
import { POSE_REFERENCES, POSE_CATEGORY_LABELS, type PoseCategory } from '../poses/reference'

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.08,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// ── Sequence theme grouping ────────────────────────────────────────────────

type SequenceGroup = { label: string; emoji: string; sequences: PoseSequence[] }

function groupSequences(sequences: PoseSequence[]): SequenceGroup[] {
  const flowIds = new Set(['surya-namaskar-beginner', 'gentle-morning', 'standing-strength'])
  const strengthIds = new Set(['core-balance', 'back-strength'])
  const restIds = new Set(['hip-opening', 'relaxation-recovery', 'seated-flexibility'])

  const flow: PoseSequence[] = []
  const strength: PoseSequence[] = []
  const rest: PoseSequence[] = []

  for (const seq of sequences) {
    if (flowIds.has(seq.id)) flow.push(seq)
    else if (strengthIds.has(seq.id)) strength.push(seq)
    else if (restIds.has(seq.id)) rest.push(seq)
    else flow.push(seq) // fallback
  }

  const groups: SequenceGroup[] = []
  if (flow.length)     groups.push({ label: 'Flow Sequences',           emoji: '🌊', sequences: flow })
  if (strength.length) groups.push({ label: 'Strength & Balance',       emoji: '💪', sequences: strength })
  if (rest.length)     groups.push({ label: 'Flexibility & Relaxation', emoji: '🧘', sequences: rest })
  return groups
}

// ── Pose category grouping ─────────────────────────────────────────────────

type PoseGroup = { category: PoseCategory; label: string; emoji: string; poses: string[] }

function groupPoses(poses: string[]): PoseGroup[] {
  const poseSet = new Set(poses)
  const categoryMap = new Map<PoseCategory, string[]>()

  for (const ref of POSE_REFERENCES) {
    if (!poseSet.has(ref.pose)) continue
    const list = categoryMap.get(ref.category) ?? []
    list.push(ref.pose)
    categoryMap.set(ref.category, list)
  }

  // Add any poses not in POSE_REFERENCES to 'standing' as fallback
  const referenced = new Set(POSE_REFERENCES.map(r => r.pose))
  for (const p of poses) {
    if (!referenced.has(p)) {
      const list = categoryMap.get('standing') ?? []
      list.push(p)
      categoryMap.set('standing', list)
    }
  }

  const groups: PoseGroup[] = []
  const entries = [...categoryMap.entries()].sort(
    (a, b) => POSE_CATEGORY_LABELS[a[0]].order - POSE_CATEGORY_LABELS[b[0]].order
  )
  for (const [cat, catPoses] of entries) {
    const meta = POSE_CATEGORY_LABELS[cat]
    groups.push({ category: cat, label: meta.label, emoji: meta.emoji, poses: catPoses })
  }
  return groups
}

// ── Sequence card (extracted for reuse) ────────────────────────────────────

function SequenceCard({ seq, onClick }: { seq: PoseSequence; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/8 via-orange-500/5 to-rose-500/8 p-5 text-left shadow-lg transition-all hover:border-amber-400/45 hover:shadow-amber-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:from-amber-500/10 dark:via-orange-500/5 dark:to-rose-500/10 dark:border-amber-500/20 dark:hover:border-amber-400/35"
    >
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl transition-all group-hover:bg-amber-400/20" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl shadow-lg shadow-amber-500/30">
          ☀️
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {seq.name}
              </h3>
              <p className="text-xs italic text-amber-700/70 dark:text-amber-400/80">
                {seq.sanskritName}
              </p>
            </div>
            <span className="flex-shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              {seq.difficulty}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {seq.description}
          </p>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
            <span>{seq.steps.length} poses</span>
            <span>~{seq.durationMins} min</span>
            <span className="ml-auto font-semibold text-amber-600 transition-colors group-hover:text-amber-500 dark:text-amber-400 dark:group-hover:text-amber-300">
              Begin →
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function LandingPage(props: {
  poses: string[]
  onSelectPose: (pose: string) => void
  onBackHome: () => void
  sequences?: PoseSequence[]
  onSelectSequence?: (seq: PoseSequence) => void
}) {
  const { poses, onSelectPose, onBackHome, sequences, onSelectSequence } = props

  const sequenceGroups = useMemo(
    () => (sequences && sequences.length > 0 ? groupSequences(sequences) : []),
    [sequences],
  )
  const poseGroups = useMemo(() => groupPoses(poses), [poses])

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-neutral-950 dark:text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-4 sm:pt-6">
        <motion.div
          className="mb-6 flex justify-start"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            Back to home
          </button>
        </motion.div>

        {/* Header */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: -22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <h1 className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text pb-2 text-5xl font-bold leading-relaxed tracking-normal text-transparent">
            OorjaKull AI Yoga
          </h1>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-300">
            Choose a sequence or individual pose to begin
          </p>
          <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
        </motion.div>

        {/* ── Guided Sequences (grouped by theme) ─────────────────────── */}
        {sequenceGroups.length > 0 && onSelectSequence && (
          <motion.div
            className="mb-14"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
          >
            <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Guided Sequences
            </h2>
            {sequenceGroups.map((group) => (
              <div key={group.label} className="mb-8 last:mb-0">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span>{group.emoji}</span>
                  {group.label}
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {group.sequences.map((seq) => (
                    <SequenceCard
                      key={seq.id}
                      seq={seq}
                      onClick={() => onSelectSequence(seq)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Divider between sequences and poses ─────────────────────── */}
        {sequenceGroups.length > 0 && (
          <div className="mb-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Individual Poses</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>
        )}

        {/* ── Individual Poses (grouped by category) ──────────────────── */}
        {poseGroups.map((group) => (
          <motion.div
            key={group.category}
            className="mb-10 last:mb-0"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
          >
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>{group.emoji}</span>
              {group.label}
              <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">
                ({group.poses.length})
              </span>
            </h3>
            <motion.div
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {group.poses.map((pose, i) => (
                <motion.div key={pose} variants={cardVariants}>
                  <PoseCard
                    poseName={pose}
                    index={i}
                    onClick={() => onSelectPose(pose)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        ))}

        <motion.p
          className="mt-10 text-center text-xs text-slate-400 dark:text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Enable Voice in the top bar for guided audio instructions
        </motion.p>
      </div>
    </div>
  )
}
