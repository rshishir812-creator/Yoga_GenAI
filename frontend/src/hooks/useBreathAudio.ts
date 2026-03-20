import { useCallback, useEffect, useRef, useState } from 'react'
import type { BreathworkPhase } from '../api/client'

type UseBreathAudioResult = {
  isMuted: boolean
  toggleMute: () => void
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

export function useBreathAudio(): UseBreathAudioResult {
  const [isMuted, setIsMuted] = useState(false)

  const contextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const activeNodesRef = useRef<ActiveAudioNode[]>([])

  const stopActiveNodes = useCallback(() => {
    for (const node of activeNodesRef.current) {
      try {
        node.stop()
      } catch {
        // no-op
      }
    }
    activeNodesRef.current = []
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

    stopActiveNodes()

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

      activeNodesRef.current.push({
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

      activeNodesRef.current.push({
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

    activeNodesRef.current.push({
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
  }, [ensureAudioContext, stopActiveNodes])

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

  useEffect(() => {
    return () => {
      stopActiveNodes()
      const ctx = contextRef.current
      if (ctx) {
        void ctx.close().catch(() => undefined)
      }
      contextRef.current = null
      masterGainRef.current = null
    }
  }, [stopActiveNodes])

  useEffect(() => {
    const master = masterGainRef.current
    const context = contextRef.current
    if (!master || !context) return

    master.gain.setTargetAtTime(clamp01(isMuted ? 0 : 0.7), context.currentTime, 0.02)
  }, [isMuted])

  return {
    isMuted,
    toggleMute,
    triggerPhaseAudio,
  }
}
