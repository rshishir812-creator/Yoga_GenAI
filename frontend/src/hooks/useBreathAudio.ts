import { useCallback, useEffect, useRef, useState } from 'react'
import type { BreathworkPhase } from '../api/client'

export type AmbientMode = 'off' | 'rain' | 'ocean' | 'om'

type UseBreathAudioResult = {
  isMuted: boolean
  toggleMute: () => void
  ambientMode: AmbientMode
  cycleAmbientMode: () => void
  setAmbientMode: (mode: AmbientMode) => void
  triggerPhaseAudio: (phase: BreathworkPhase) => Promise<void>
}

type ActiveAudioNode = {
  stop: () => void
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function isExpandPhase(phase: BreathworkPhase) {
  return phase.animation === 'expand' || /inhale|breathe in/i.test(phase.label)
}

function isHoldPhase(phase: BreathworkPhase) {
  return phase.animation === 'hold' || /hold|retain/i.test(phase.label)
}

function createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const frameCount = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
  const channel = buffer.getChannelData(0)

  for (let i = 0; i < frameCount; i += 1) {
    channel[i] = (Math.random() * 2 - 1) * 0.25
  }

  return buffer
}

const AMBIENT_MODES: AmbientMode[] = ['off', 'rain', 'ocean', 'om']

export function useBreathAudio(): UseBreathAudioResult {
  const [isMuted, setIsMuted] = useState(false)
  const [ambientMode, setAmbientModeState] = useState<AmbientMode>('off')

  const contextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const phaseNodesRef = useRef<ActiveAudioNode[]>([])
  const ambientStopRef = useRef<(() => void) | null>(null)

  const stopPhaseNodes = useCallback(() => {
    for (const node of phaseNodesRef.current) {
      try {
        node.stop()
      } catch {
        // no-op
      }
    }
    phaseNodesRef.current = []
  }, [])

  const stopAmbient = useCallback(() => {
    if (!ambientStopRef.current) return
    try {
      ambientStopRef.current()
    } catch {
      // no-op
    }
    ambientStopRef.current = null
  }, [])

  const ensureAudioContext = useCallback(async () => {
    if (!contextRef.current) {
      const context = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const masterGain = context.createGain()
      masterGain.gain.value = isMuted ? 0 : 0.7
      masterGain.connect(context.destination)
      contextRef.current = context
      masterGainRef.current = masterGain
    }

    const ctx = contextRef.current
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume()
    }

    return { ctx: contextRef.current, master: masterGainRef.current }
  }, [isMuted])

  const triggerPhaseAudio = useCallback(async (phase: BreathworkPhase) => {
    const audio = await ensureAudioContext().catch(() => null)
    if (!audio?.ctx || !audio.master) return

    const ctx = audio.ctx
    const master = audio.master
    const now = ctx.currentTime
    const duration = Math.max(0.2, phase.duration_sec)

    stopPhaseNodes()

    if (isExpandPhase(phase)) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(110, now)
      osc.frequency.linearRampToValueAtTime(220, now + duration)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(200, now)
      filter.frequency.linearRampToValueAtTime(2000, now + duration)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(0.3, now + Math.min(0.5, duration * 0.4))
      gain.gain.setValueAtTime(0.3, now + Math.max(0, duration - 0.3))
      gain.gain.linearRampToValueAtTime(0.0001, now + duration)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(master)

      osc.start(now)
      osc.stop(now + duration + 0.02)

      phaseNodesRef.current.push({
        stop: () => {
          osc.stop()
          osc.disconnect()
          filter.disconnect()
          gain.disconnect()
        },
      })
      return
    }

    if (isHoldPhase(phase)) {
      const baseOsc = ctx.createOscillator()
      const harmonicOsc = ctx.createOscillator()
      const baseGain = ctx.createGain()
      const harmonicGain = ctx.createGain()

      baseOsc.type = 'sine'
      harmonicOsc.type = 'sine'
      baseOsc.frequency.setValueAtTime(432, now)
      harmonicOsc.frequency.setValueAtTime(864, now)

      baseGain.gain.setValueAtTime(0.0001, now)
      baseGain.gain.linearRampToValueAtTime(0.4, now + 0.01)
      baseGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(4, duration))

      harmonicGain.gain.setValueAtTime(0.0001, now)
      harmonicGain.gain.linearRampToValueAtTime(0.12, now + 0.01)
      harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(4, duration))

      baseOsc.connect(baseGain)
      harmonicOsc.connect(harmonicGain)
      baseGain.connect(master)
      harmonicGain.connect(master)

      baseOsc.start(now)
      harmonicOsc.start(now)
      baseOsc.stop(now + Math.min(4.2, duration + 0.2))
      harmonicOsc.stop(now + Math.min(4.2, duration + 0.2))

      phaseNodesRef.current.push({
        stop: () => {
          baseOsc.stop()
          harmonicOsc.stop()
          baseOsc.disconnect()
          harmonicOsc.disconnect()
          baseGain.disconnect()
          harmonicGain.disconnect()
        },
      })
      return
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const highpass = ctx.createBiquadFilter()
    const noiseSource = ctx.createBufferSource()
    const noiseGain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(220, now)
    osc.frequency.linearRampToValueAtTime(110, now + duration)

    highpass.type = 'highpass'
    highpass.Q.value = 0.5
    highpass.frequency.setValueAtTime(2000, now)
    highpass.frequency.linearRampToValueAtTime(200, now + duration)

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.linearRampToValueAtTime(0.0001, now + duration)

    noiseSource.buffer = createNoiseBuffer(ctx, duration)
    noiseGain.gain.setValueAtTime(0.07, now)
    noiseGain.gain.linearRampToValueAtTime(0.0001, now + duration)

    osc.connect(highpass)
    highpass.connect(gain)
    gain.connect(master)

    noiseSource.connect(noiseGain)
    noiseGain.connect(master)

    osc.start(now)
    noiseSource.start(now)
    osc.stop(now + duration + 0.02)
    noiseSource.stop(now + duration + 0.02)

    phaseNodesRef.current.push({
      stop: () => {
        osc.stop()
        noiseSource.stop()
        osc.disconnect()
        highpass.disconnect()
        gain.disconnect()
        noiseSource.disconnect()
        noiseGain.disconnect()
      },
    })
  }, [ensureAudioContext, stopPhaseNodes])

  const startAmbient = useCallback((ctx: AudioContext, master: GainNode, mode: AmbientMode) => {
    stopAmbient()
    if (mode === 'off') return

    const now = ctx.currentTime

    if (mode === 'rain') {
      const rainNoise = ctx.createBufferSource()
      rainNoise.buffer = createNoiseBuffer(ctx, 4.5)
      rainNoise.loop = true

      const highpass = ctx.createBiquadFilter()
      highpass.type = 'highpass'
      highpass.frequency.setValueAtTime(900, now)

      const lowpass = ctx.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.setValueAtTime(4200, now)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.7)

      rainNoise.connect(highpass)
      highpass.connect(lowpass)
      lowpass.connect(gain)
      gain.connect(master)
      rainNoise.start(now)

      ambientStopRef.current = () => {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08)
        window.setTimeout(() => {
          try {
            rainNoise.stop()
          } catch {
            // no-op
          }
          rainNoise.disconnect()
          highpass.disconnect()
          lowpass.disconnect()
          gain.disconnect()
        }, 180)
      }
      return
    }

    if (mode === 'ocean') {
      const surfNoise = ctx.createBufferSource()
      surfNoise.buffer = createNoiseBuffer(ctx, 6)
      surfNoise.loop = true

      const bandpass = ctx.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.setValueAtTime(360, now)
      bandpass.Q.value = 0.8

      const swell = ctx.createGain()
      const overall = ctx.createGain()
      overall.gain.setValueAtTime(0.0001, now)
      overall.gain.exponentialRampToValueAtTime(0.14, now + 0.9)

      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.type = 'sine'
      lfo.frequency.setValueAtTime(0.09, now)
      lfoGain.gain.setValueAtTime(0.05, now)

      swell.gain.setValueAtTime(0.09, now)

      lfo.connect(lfoGain)
      lfoGain.connect(swell.gain)

      surfNoise.connect(bandpass)
      bandpass.connect(swell)
      swell.connect(overall)
      overall.connect(master)

      surfNoise.start(now)
      lfo.start(now)

      ambientStopRef.current = () => {
        overall.gain.cancelScheduledValues(ctx.currentTime)
        overall.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1)
        window.setTimeout(() => {
          try {
            surfNoise.stop()
          } catch {
            // no-op
          }
          try {
            lfo.stop()
          } catch {
            // no-op
          }
          surfNoise.disconnect()
          bandpass.disconnect()
          swell.disconnect()
          overall.disconnect()
          lfo.disconnect()
          lfoGain.disconnect()
        }, 210)
      }
      return
    }

    const fundamental = ctx.createOscillator()
    const harmonic = ctx.createOscillator()
    const beat = ctx.createOscillator()
    const fundamentalGain = ctx.createGain()
    const harmonicGain = ctx.createGain()
    const beatGain = ctx.createGain()
    const lowpass = ctx.createBiquadFilter()

    fundamental.type = 'sine'
    harmonic.type = 'triangle'
    beat.type = 'sine'

    fundamental.frequency.setValueAtTime(136.1, now)
    harmonic.frequency.setValueAtTime(272.2, now)
    beat.frequency.setValueAtTime(0.11, now)

    fundamentalGain.gain.setValueAtTime(0.0001, now)
    fundamentalGain.gain.exponentialRampToValueAtTime(0.09, now + 1)

    harmonicGain.gain.setValueAtTime(0.0001, now)
    harmonicGain.gain.exponentialRampToValueAtTime(0.03, now + 1)

    beatGain.gain.setValueAtTime(0.015, now)

    lowpass.type = 'lowpass'
    lowpass.frequency.setValueAtTime(1200, now)

    beat.connect(beatGain)
    beatGain.connect(fundamentalGain.gain)

    fundamental.connect(fundamentalGain)
    harmonic.connect(harmonicGain)
    fundamentalGain.connect(lowpass)
    harmonicGain.connect(lowpass)
    lowpass.connect(master)

    fundamental.start(now)
    harmonic.start(now)
    beat.start(now)

    ambientStopRef.current = () => {
      fundamentalGain.gain.cancelScheduledValues(ctx.currentTime)
      harmonicGain.gain.cancelScheduledValues(ctx.currentTime)
      fundamentalGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12)
      harmonicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12)
      window.setTimeout(() => {
        try {
          fundamental.stop()
        } catch {
          // no-op
        }
        try {
          harmonic.stop()
        } catch {
          // no-op
        }
        try {
          beat.stop()
        } catch {
          // no-op
        }
        fundamental.disconnect()
        harmonic.disconnect()
        beat.disconnect()
        beatGain.disconnect()
        fundamentalGain.disconnect()
        harmonicGain.disconnect()
        lowpass.disconnect()
      }, 230)
    }
  }, [stopAmbient])

  useEffect(() => {
    if (isMuted) {
      stopAmbient()
      return
    }

    void ensureAudioContext()
      .then((audio) => {
        if (!audio?.ctx || !audio.master) return
        startAmbient(audio.ctx, audio.master, ambientMode)
      })
      .catch(() => undefined)
  }, [ambientMode, ensureAudioContext, isMuted, startAmbient, stopAmbient])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      const master = masterGainRef.current
      const context = contextRef.current
      if (master && context) {
        master.gain.setTargetAtTime(next ? 0 : 0.7, context.currentTime, 0.02)
      }
      return next
    })
  }, [])

  const setAmbientMode = useCallback((mode: AmbientMode) => {
    setAmbientModeState(mode)
  }, [])

  const cycleAmbientMode = useCallback(() => {
    setAmbientModeState((prev) => {
      const currentIndex = AMBIENT_MODES.indexOf(prev)
      const nextIndex = (currentIndex + 1) % AMBIENT_MODES.length
      return AMBIENT_MODES[nextIndex]
    })
  }, [])

  useEffect(() => {
    return () => {
      stopPhaseNodes()
      stopAmbient()
      const ctx = contextRef.current
      if (ctx) {
        void ctx.close().catch(() => undefined)
      }
      contextRef.current = null
      masterGainRef.current = null
    }
  }, [stopAmbient, stopPhaseNodes])

  useEffect(() => {
    const master = masterGainRef.current
    const context = contextRef.current
    if (!master || !context) return

    master.gain.setTargetAtTime(clamp01(isMuted ? 0 : 0.7), context.currentTime, 0.02)
  }, [isMuted])

  return {
    isMuted,
    toggleMute,
    ambientMode,
    cycleAmbientMode,
    setAmbientMode,
    triggerPhaseAudio,
  }
}
