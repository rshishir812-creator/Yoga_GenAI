import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BreathworkPhase } from '../api/client'

type UseBreathingSessionParams = {
  phases: BreathworkPhase[]
  cycles: number
}

type UseBreathingSessionResult = {
  currentPhase: BreathworkPhase
  phaseProgress: number
  sessionProgress: number
  currentCycle: number
  totalCycles: number
  elapsedSeconds: number
  isComplete: boolean
  isPaused: boolean
  pause: () => void
  resume: () => void
  end: () => void
}

const FALLBACK_PHASE: BreathworkPhase = {
  label: 'Breathe In',
  duration_sec: 4,
  instruction: 'Inhale gently',
  animation: 'expand',
}

export function useBreathingSession(params: UseBreathingSessionParams): UseBreathingSessionResult {
  const activePhases = useMemo(
    () => params.phases.filter((phase) => phase.duration_sec > 0),
    [params.phases],
  )

  const phases = activePhases.length ? activePhases : [FALLBACK_PHASE]
  const totalCycles = Math.max(1, params.cycles)
  const totalSessionMs = useMemo(
    () => phases.reduce((sum, phase) => sum + phase.duration_sec * 1000, 0) * totalCycles,
    [phases, totalCycles],
  )

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [currentCycle, setCurrentCycle] = useState(1)
  const [phaseProgress, setPhaseProgress] = useState(0)
  const [sessionProgress, setSessionProgress] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(true)
  const [isComplete, setIsComplete] = useState(false)

  const rafRef = useRef<number | null>(null)
  const lastTickRef = useRef<number | null>(null)
  const phaseElapsedMsRef = useRef(0)
  const sessionElapsedMsRef = useRef(0)
  const phaseIndexRef = useRef(0)
  const cycleRef = useRef(1)
  const pausedRef = useRef(true)
  const completeRef = useRef(false)

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    lastTickRef.current = null
  }, [])

  const end = useCallback(() => {
    stopRaf()
    pausedRef.current = true
    completeRef.current = true
    setIsPaused(true)
    setIsComplete(true)
    setPhaseProgress(1)
    setSessionProgress(1)
  }, [stopRaf])

  const tick = useCallback((now: number) => {
    const last = lastTickRef.current ?? now
    const delta = Math.max(0, now - last)
    lastTickRef.current = now

    if (!pausedRef.current && !completeRef.current) {
      phaseElapsedMsRef.current += delta
      sessionElapsedMsRef.current += delta

      let phaseDurationMs = phases[phaseIndexRef.current].duration_sec * 1000

      while (phaseElapsedMsRef.current >= phaseDurationMs && !completeRef.current) {
        phaseElapsedMsRef.current -= phaseDurationMs

        const nextPhaseIndex = phaseIndexRef.current + 1
        if (nextPhaseIndex >= phases.length) {
          const nextCycle = cycleRef.current + 1
          if (nextCycle > totalCycles) {
            completeRef.current = true
            pausedRef.current = true
            setIsComplete(true)
            setIsPaused(true)
            setPhaseProgress(1)
            setSessionProgress(1)
            setElapsedSeconds(Math.floor(totalSessionMs / 1000))
            stopRaf()
            return
          }
          cycleRef.current = nextCycle
          setCurrentCycle(nextCycle)
          phaseIndexRef.current = 0
          setCurrentPhaseIndex(0)
        } else {
          phaseIndexRef.current = nextPhaseIndex
          setCurrentPhaseIndex(nextPhaseIndex)
        }

        phaseDurationMs = phases[phaseIndexRef.current].duration_sec * 1000
      }

      const nextPhaseProgress = Math.min(1, phaseElapsedMsRef.current / Math.max(1, phaseDurationMs))
      const nextSessionProgress = Math.min(1, sessionElapsedMsRef.current / Math.max(1, totalSessionMs))

      setPhaseProgress(nextPhaseProgress)
      setSessionProgress(nextSessionProgress)
      setElapsedSeconds(Math.floor(sessionElapsedMsRef.current / 1000))

      rafRef.current = window.requestAnimationFrame(tick)
    }
  }, [phases, stopRaf, totalCycles, totalSessionMs])

  const resume = useCallback(() => {
    if (completeRef.current) return
    if (!pausedRef.current) return
    pausedRef.current = false
    setIsPaused(false)
    lastTickRef.current = null
    rafRef.current = window.requestAnimationFrame(tick)
  }, [tick])

  const pause = useCallback(() => {
    pausedRef.current = true
    setIsPaused(true)
    stopRaf()
  }, [stopRaf])

  useEffect(() => {
    phaseIndexRef.current = 0
    cycleRef.current = 1
    phaseElapsedMsRef.current = 0
    sessionElapsedMsRef.current = 0

    setCurrentPhaseIndex(0)
    setCurrentCycle(1)
    setPhaseProgress(0)
    setSessionProgress(0)
    setElapsedSeconds(0)
    setIsPaused(true)
    setIsComplete(false)
    pausedRef.current = true
    completeRef.current = false

    stopRaf()

    return () => {
      stopRaf()
    }
  }, [phases, totalCycles, stopRaf])

  const currentPhase = phases[currentPhaseIndex] ?? FALLBACK_PHASE

  return {
    currentPhase,
    phaseProgress,
    sessionProgress,
    currentCycle,
    totalCycles,
    elapsedSeconds,
    isComplete,
    isPaused,
    pause,
    resume,
    end,
  }
}
