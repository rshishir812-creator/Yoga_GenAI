import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { BreathworkProtocol } from '../api/client'
import AmbientSoundToggle from '../components/breathwork/AmbientSoundToggle'
import BreathLogo from '../components/breathwork/BreathLogo'
import BreathPhaseLabel from '../components/breathwork/BreathPhaseLabel'
import BreathWaveBackground from '../components/breathwork/BreathWaveBackground'
import SessionCompleteOverlay from '../components/breathwork/SessionCompleteOverlay'
import VolumeToggle from '../components/breathwork/VolumeToggle'
import { useBreathAudio } from '../hooks/useBreathAudio'
import { useBreathingSession } from '../hooks/useBreathingSession'

interface BreathworkSessionProps {
  protocol: BreathworkProtocol
  onExit: (toastMessage?: string) => void
}

function formatTime(totalSec: number) {
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function BreathworkSession({ protocol, onExit }: BreathworkSessionProps) {
  const activePhases = useMemo(
    () => protocol.phases.filter((phase) => phase.duration_sec > 0),
    [protocol.phases],
  )

  const {
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
  } = useBreathingSession({ phases: protocol.phases, cycles: protocol.cycles })

  const { isMuted, toggleMute, ambientMode, cycleAmbientMode, triggerPhaseAudio } = useBreathAudio()

  const [sessionStarted, setSessionStarted] = useState(false)

  const phaseTriggerKeyRef = useRef<string>('')

  function vibrateByPhase(phaseLabel: string, animation: string) {
    if (!('vibrate' in navigator)) return
    if (animation === 'expand' || /inhale|breathe in/i.test(phaseLabel)) {
      navigator.vibrate([18, 22, 18])
      return
    }
    if (animation === 'hold' || /hold|retain/i.test(phaseLabel)) {
      navigator.vibrate([25, 40, 25, 40, 25])
      return
    }
    navigator.vibrate(65)
  }

  useEffect(() => {
    if (!sessionStarted || isComplete) return

    const phaseIndex = Math.max(0, activePhases.findIndex((phase) => phase === currentPhase))
    const key = `${currentCycle}-${phaseIndex}`
    if (phaseTriggerKeyRef.current === key) return
    phaseTriggerKeyRef.current = key

    void triggerPhaseAudio(currentPhase)
    vibrateByPhase(currentPhase.label, currentPhase.animation)
  }, [activePhases, currentCycle, currentPhase, isComplete, sessionStarted, triggerPhaseAudio])

  const handleStart = async () => {
    setSessionStarted(true)

    const phaseIndex = Math.max(0, activePhases.findIndex((phase) => phase === currentPhase))
    phaseTriggerKeyRef.current = `${currentCycle}-${phaseIndex}`
    await triggerPhaseAudio(currentPhase)
    resume()
  }

  const handlePauseResume = () => {
    if (!sessionStarted || isComplete) return
    if (isPaused) resume()
    else pause()
  }

  const handleEndSession = () => {
    end()
    onExit('Session ended')
  }

  const phaseRemainingSec = Math.max(
    0,
    Math.ceil((currentPhase.duration_sec ?? 0) * (1 - phaseProgress)),
  )

  return (
    <div className="relative min-h-screen overflow-hidden text-white" style={{ height: '100dvh' }}>
      <BreathWaveBackground phase={currentPhase} phaseProgress={phaseProgress} />

      <div
        className="relative z-20 flex h-full flex-col"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingBottom: 'max(0.9rem, env(safe-area-inset-bottom))',
        }}
      >
        <header className="flex items-start justify-between px-3 sm:px-5">
          <button
            type="button"
            onClick={handleEndSession}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-red-500/35 bg-red-500/5 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-red-200 transition hover:bg-red-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            End
          </button>

          <div className="flex flex-1 flex-col items-center text-center">
            <p className="text-3xl font-semibold tabular-nums text-white/95 sm:text-4xl">
              {formatTime(elapsedSeconds)}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/45 sm:text-xs">
              Cycle {Math.min(currentCycle, totalCycles)} of {totalCycles}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <AmbientSoundToggle mode={ambientMode} onToggle={cycleAmbientMode} />
            <VolumeToggle isMuted={isMuted} onToggle={toggleMute} />
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <BreathLogo phase={currentPhase} phaseProgress={phaseProgress} />

          <div className="mt-9">
            <BreathPhaseLabel phase={currentPhase} cycle={currentCycle} />
          </div>

          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/45">
            {phaseRemainingSec}s remaining
          </p>

          {!sessionStarted && (
            <button
              type="button"
              onClick={() => {
                void handleStart()
              }}
              className="mt-6 min-h-12 rounded-full border border-teal-300/40 bg-teal-300/10 px-8 py-3 text-sm font-medium text-teal-100 transition hover:bg-teal-300/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            >
              Start Session
            </button>
          )}

          {sessionStarted && !isComplete && (
            <button
              type="button"
              onClick={handlePauseResume}
              className="mt-6 min-h-12 rounded-full border border-white/20 bg-black/35 px-6 py-3 text-xs font-medium tracking-[0.15em] text-white/85 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              {isPaused ? 'RESUME' : 'PAUSE'}
            </button>
          )}
        </main>

        <footer className="px-3 pb-1 sm:px-5">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-white/55">
              <span>Session Flow</span>
              <span>{Math.round(sessionProgress * 100)}%</span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: totalCycles }).map((_, index) => {
                const done = index + 1 < currentCycle || isComplete
                const active = index + 1 === currentCycle && !isComplete
                return (
                  <span
                    key={`cycle-segment-${index + 1}`}
                    className="h-2 flex-1 rounded-full"
                    style={{
                      background: done
                        ? 'linear-gradient(90deg, rgba(16,185,129,0.9), rgba(45,212,191,0.9))'
                        : active
                          ? 'linear-gradient(90deg, rgba(45,212,191,0.75), rgba(129,140,248,0.75))'
                          : 'rgba(255,255,255,0.12)',
                    }}
                  />
                )
              })}
            </div>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {isComplete && (
          <SessionCompleteOverlay
            protocol={protocol}
            totalCycles={totalCycles}
            elapsedSeconds={elapsedSeconds}
            onDone={() => onExit('Session Complete')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
