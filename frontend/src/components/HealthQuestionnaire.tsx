/**
 * HealthQuestionnaire — 5-step wizard for health data collection.
 *
 * Steps:
 * 1. Medical conditions  (multi-select)
 * 2. Activity symptoms   (multi-select)
 * 3. Mobility restrictions (multi-select)
 * 4. Current pain areas + level
 * 5. Pregnancy / surgery + final submit
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserHealthInput } from '../types/health'
import {
  MEDICAL_CONDITIONS,
  ACTIVITY_SYMPTOMS,
  MOBILITY_RESTRICTIONS,
  PAIN_AREAS,
  createDefaultHealthInput,
} from '../types/health'

interface Props {
  onSubmit: (input: UserHealthInput) => void
  onBack: () => void
  isLoading?: boolean
}

type Step = 1 | 2 | 3 | 4 | 5
const TOTAL_STEPS = 5

const STEP_TITLES: Record<Step, string> = {
  1: 'Medical Conditions',
  2: 'Activity Symptoms',
  3: 'Mobility',
  4: 'Current Pain',
  5: 'Final Details',
}

const STEP_SUBTITLES: Record<Step, string> = {
  1: 'Do you have any of these conditions? Select all that apply.',
  2: 'Do you experience any of these during physical activity?',
  3: 'Do you have any mobility restrictions?',
  4: 'Are you currently experiencing pain anywhere?',
  5: 'A few final questions to complete your profile.',
}

export default function HealthQuestionnaire({ onSubmit, onBack, isLoading }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [data, setData] = useState<UserHealthInput>(createDefaultHealthInput())

  const next = () => setStep(Math.min(TOTAL_STEPS, step + 1) as Step)
  const prev = () => step === 1 ? onBack() : setStep(Math.max(1, step - 1) as Step)

  function toggleItem<K extends keyof UserHealthInput>(key: K, value: string) {
    setData(prev => {
      const arr = prev[key] as string[]
      if (value === 'none') {
        return { ...prev, [key]: ['none'] }
      }
      const filtered = arr.filter(v => v !== 'none')
      if (filtered.includes(value)) {
        return { ...prev, [key]: filtered.filter(v => v !== value) }
      }
      return { ...prev, [key]: [...filtered, value] }
    })
  }

  function handleSubmit() {
    onSubmit({ ...data, consent_given: true })
  }

  function renderMultiSelect(
    key: keyof UserHealthInput,
    options: { value: string; label: string; description?: string }[],
  ) {
    const selected = (data[key] as string[]) || []
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
        {options.map(opt => {
          const isSelected = selected.includes(opt.value)
          const isNone = opt.value === 'none'
          return (
            <button
              key={opt.value}
              onClick={() => toggleItem(key, opt.value)}
              className={`text-left p-3 rounded-xl border-2 transition-all text-sm ${
                isSelected
                  ? isNone
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-lg ${isSelected ? '' : 'opacity-30'}`}>
                  {isSelected ? '✓' : '○'}
                </span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{opt.label}</div>
                  {opt.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 px-4 py-8"
    >
      <div className="max-w-lg w-full rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6 space-y-5">
        {/* Progress bar */}
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wide">
            Step {step} of {TOTAL_STEPS}
          </p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {STEP_TITLES[step]}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {STEP_SUBTITLES[step]}
          </p>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && renderMultiSelect('medical_conditions', MEDICAL_CONDITIONS)}
            {step === 2 && renderMultiSelect('activity_symptoms', ACTIVITY_SYMPTOMS)}
            {step === 3 && renderMultiSelect('mobility_restrictions', MOBILITY_RESTRICTIONS)}
            {step === 4 && (
              <div className="space-y-4">
                {renderMultiSelect('current_pain_areas', PAIN_AREAS)}
                {!(data.current_pain_areas.length === 1 && data.current_pain_areas[0] === 'none') &&
                  data.current_pain_areas.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Pain level (0 = none, 10 = worst)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={10}
                          value={data.current_pain_level}
                          onChange={(e) => setData(d => ({ ...d, current_pain_level: Number(e.target.value) }))}
                          className="flex-1 accent-orange-500"
                        />
                        <span className="w-8 text-center text-lg font-bold text-orange-600">
                          {data.current_pain_level}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            )}
            {step === 5 && (
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 cursor-pointer hover:border-gray-300">
                  <input
                    type="checkbox"
                    checked={data.is_pregnant}
                    onChange={(e) => setData(d => ({ ...d, is_pregnant: e.target.checked }))}
                    className="h-5 w-5 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">I am currently pregnant</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">We'll adjust poses for your safety</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 cursor-pointer hover:border-gray-300">
                  <input
                    type="checkbox"
                    checked={data.recent_surgery_or_injury}
                    onChange={(e) => setData(d => ({ ...d, recent_surgery_or_injury: e.target.checked }))}
                    className="h-5 w-5 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">Recent surgery or injury (last 6 months)</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">We'll limit intensity accordingly</div>
                  </div>
                </label>

                {data.recent_surgery_or_injury && (
                  <textarea
                    value={data.recent_surgery_details ?? ''}
                    onChange={(e) => setData(d => ({ ...d, recent_surgery_details: e.target.value || null }))}
                    placeholder="Brief details (optional) — e.g. left knee arthroscopy 3 months ago"
                    className="w-full p-3 text-sm rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white resize-none"
                    rows={2}
                  />
                )}

                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-sm text-green-800 dark:text-green-300">
                  <p className="font-medium">✅ That's everything!</p>
                  <p className="mt-1 text-xs opacity-80">
                    Your answers help us create a safe, personalised practice.
                    You can update this anytime from your profile.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={prev}
            className="py-2.5 px-5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {step === 1 ? 'Back' : 'Previous'}
          </button>
          <div className="flex-1" />
          {step < TOTAL_STEPS ? (
            <button
              onClick={next}
              className="py-2.5 px-6 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="py-2.5 px-6 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Saving…' : 'Save & Start Practicing'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
