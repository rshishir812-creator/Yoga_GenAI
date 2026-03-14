import { useCallback, useRef } from 'react'

export type VoiceGender = 'male' | 'female'

/**
 * Named en-IN voices grouped by gender.
 * These cover Windows (Edge/Chrome Neural), macOS, iOS, and Android.
 */
const FEMALE_EN_IN = [
  'Microsoft Neerja Online',   // Edge Neural — very natural
  'Microsoft Neerja',
  'Neerja',
  'Google हिन्दी',            // Some Chrome builds expose this for en-IN
  'Veena',                     // macOS / iOS en-IN female
  'Lekha',                     // macOS en-IN female
]

const MALE_EN_IN = [
  'Microsoft Prabhat Online',  // Edge Neural male
  'Microsoft Prabhat',
  'Prabhat',
  'Rishi',                     // macOS / iOS en-IN male
]

/**
 * Pick an en-IN voice matching the requested gender.
 * Fallback order: named list → any en-IN matching gender → any en-IN → null.
 * We intentionally do NOT fall back to UK/US/AU voices.
 */
function getPreferredVoice(gender: VoiceGender = 'female'): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  const nameList = gender === 'male' ? MALE_EN_IN : FEMALE_EN_IN
  const avoidList = gender === 'male' ? FEMALE_EN_IN : MALE_EN_IN

  // 1. Try named voices for the preferred gender
  for (const name of nameList) {
    const v = voices.find((v) => v.name.includes(name))
    if (v) return v
  }

  // 2. Any en-IN voice that is NOT in the opposite-gender list
  const enINMatch = voices.find(
    (v) =>
      v.lang === 'en-IN' &&
      !avoidList.some((n) => v.name.toLowerCase().includes(n.toLowerCase())),
  )
  if (enINMatch) return enINMatch

  // 3. Any en-IN voice at all (better than nothing)
  const enIN = voices.find((v) => v.lang === 'en-IN')
  if (enIN) return enIN

  // No en-IN voice available — return null so caller can show a warning
  return null
}

/** Check whether at least one en-IN voice exists for the given gender. */
export function hasEnINVoice(gender: VoiceGender): boolean {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return false
  const nameList = gender === 'male' ? MALE_EN_IN : FEMALE_EN_IN
  // Check named voices first
  if (nameList.some((n) => voices.some((v) => v.name.includes(n)))) return true
  // Check any en-IN voice
  return voices.some((v) => v.lang === 'en-IN')
}

export interface VoiceSettings {
  rate: number          // 0.5 – 2
  pitch: number         // 0 – 2
  volume: number        // 0 – 1
  voiceName: string | null  // null = auto-select
  gender: VoiceGender   // male or female
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  rate: 0.82,
  pitch: 1.05,
  volume: 0.92,
  voiceName: null,
  gender: 'female',
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

export function useVoiceGuide(voiceEnabled: boolean, settings: VoiceSettings = DEFAULT_VOICE_SETTINGS): VoiceGuide {
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
        u.rate = settings.rate
        u.pitch = settings.pitch
        u.volume = settings.volume
        const voice = settings.voiceName
          ? window.speechSynthesis.getVoices().find((v) => v.name === settings.voiceName) ?? getPreferredVoice(settings.gender)
          : getPreferredVoice(settings.gender)
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
    [voiceEnabled, settings],
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
      u.rate = settings.rate
      u.pitch = settings.pitch
      u.volume = settings.volume
      const voice = settings.voiceName
        ? window.speechSynthesis.getVoices().find((v) => v.name === settings.voiceName) ?? getPreferredVoice(settings.gender)
        : getPreferredVoice(settings.gender)
      if (voice) u.voice = voice
      if (onEnd) u.onend = () => onEnd()
      window.speechSynthesis.speak(u)
    },
    [voiceEnabled, settings],
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
