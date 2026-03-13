import { useCallback, useRef } from 'react'

/**
 * Pick an English-India voice for correct Sanskrit / yoga pose pronunciation.
 * Falls back through en-IN → en-US favourites → any English → first available.
 */
function getPreferredVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  // 1. Prefer well-known en-IN voices (best for Sanskrit names)
  const EN_IN_NAMES = ['Microsoft Neerja', 'Neerja', 'Rishi', 'Veena', 'Lekha']
  for (const name of EN_IN_NAMES) {
    const v = voices.find((v) => v.name.includes(name))
    if (v) return v
  }
  // 2. Any en-IN voice
  const enIN = voices.find((v) => v.lang === 'en-IN')
  if (enIN) return enIN

  // 3. Fallback: well-known en-US voices → any en-US → any English → first
  const FALLBACK = ['Samantha', 'Google US English', 'Microsoft Zira', 'Karen', 'Moira', 'Tessa']
  for (const name of FALLBACK) {
    const v = voices.find((v) => v.name.includes(name))
    if (v) return v
  }
  return (
    voices.find((v) => v.lang === 'en-US') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0] ??
    null
  )
}

export interface VoiceGuide {
  /** Speak text. onEnd fires when utterance completes (or after 5 s if voice disabled). */
  speak: (text: string, onEnd?: () => void) => void
  /**
   * Rate-limited speak for live feedback (2 s min gap, skips duplicate text).
   * onEnd fires when utterance completes.
   */
  speakFeedback: (text: string, onEnd?: () => void) => void
  /** Cancel any in-progress speech. */
  cancel: () => void
}

export function useVoiceGuide(voiceEnabled: boolean): VoiceGuide {
  const lastSpokenRef = useRef<string>('')
  const lastSpeakTsRef = useRef<number>(0)
  const silentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (silentTimerRef.current !== null) {
        clearTimeout(silentTimerRef.current)
        silentTimerRef.current = null
      }

      if (!voiceEnabled) {
        if (onEnd) {
          silentTimerRef.current = setTimeout(() => {
            silentTimerRef.current = null
            onEnd()
          }, 5000)
        }
        return
      }

      window.speechSynthesis.cancel()

      const doSpeak = () => {
        const u = new SpeechSynthesisUtterance(text)
        u.rate = 0.88
        u.pitch = 1.0
        const voice = getPreferredVoice()
        if (voice) u.voice = voice
        if (onEnd) u.onend = () => onEnd()
        window.speechSynthesis.speak(u)
      }

      if (window.speechSynthesis.getVoices().length > 0) {
        doSpeak()
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true })
        setTimeout(() => {
          if (!window.speechSynthesis.speaking) doSpeak()
        }, 300)
      }
    },
    [voiceEnabled],
  )

  const speakFeedback = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!voiceEnabled || !text) {
        onEnd?.()
        return
      }
      const now = Date.now()
      if (text === lastSpokenRef.current) {
        onEnd?.()
        return
      }
      if (now - lastSpeakTsRef.current < 2000) {
        onEnd?.()
        return
      }

      lastSpokenRef.current = text
      lastSpeakTsRef.current = now

      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 0.88
      u.pitch = 1.0
      const voice = getPreferredVoice()
      if (voice) u.voice = voice
      if (onEnd) u.onend = () => onEnd()
      window.speechSynthesis.speak(u)
    },
    [voiceEnabled],
  )

  const cancel = useCallback(() => {
    if (silentTimerRef.current !== null) {
      clearTimeout(silentTimerRef.current)
      silentTimerRef.current = null
    }
    window.speechSynthesis.cancel()
  }, [])

  return { speak, speakFeedback, cancel }
}
