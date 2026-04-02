import { useCallback, useRef, useState } from 'react'

type SpeechRecognitionCtor = new () => SpeechRecognition

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((ev: SpeechRecognitionEvent) => void) | null
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionCtor | null
}

export const speechRecognitionSupported = !!getSpeechRecognition()

export type VoiceAction = 'next' | 'again' | 'exit'

function matchAction(transcript: string): VoiceAction | null {
  const t = transcript.toLowerCase().trim()

  if (
    /\bnext\b/.test(t) ||
    /\bcontinue\b/.test(t) ||
    /\bfinish\b/.test(t) ||
    /\bready\b/.test(t) ||
    /\bbegin\b/.test(t) ||
    /\bstart\b/.test(t) ||
    /\blet'?s\s*begin\b/.test(t) ||
    /\baage\b/.test(t) ||
    /\bshuru\b/.test(t)
  ) {
    return 'next'
  }
  if (/\bagain\b/.test(t) || /\bretry\b/.test(t) || /\brepeat\b/.test(t) || /\bonce more\b/.test(t) || /\bdobara\b/.test(t) || /\bphir\s*se\b/.test(t)) {
    return 'again'
  }
  if (/\bexit\b/.test(t) || /\bstop\b/.test(t) || /\bquit\b/.test(t) || /\bend\b/.test(t) || /\bhome\b/.test(t)) {
    return 'exit'
  }

  return null
}

export function useVoiceCommand() {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const callbackRef = useRef<((action: VoiceAction) => void) | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [listening, setListening] = useState(false)

  const stopListening = useCallback(() => {
    setListening(false)
    callbackRef.current = null
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
  }, [])

  const startListening = useCallback((onAction: (action: VoiceAction) => void) => {
    stopListening()

    const Ctor = getSpeechRecognition()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = 'en-IN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 3

    recognitionRef.current = recognition
    callbackRef.current = onAction
    setListening(true)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        for (let j = 0; j < result.length; j++) {
          const action = matchAction(result[j].transcript)
          if (action && callbackRef.current) {
            const cb = callbackRef.current
            stopListening()
            cb(action)
            return
          }
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        stopListening()
      }
    }

    recognition.onend = () => {
      if (!recognitionRef.current || !callbackRef.current) return
      try {
        recognition.start()
      } catch {
        stopListening()
      }
    }

    try {
      recognition.start()
    } catch {
      stopListening()
      return
    }

    timeoutRef.current = setTimeout(() => {
      stopListening()
    }, 30000)
  }, [stopListening])

  return {
    startListening,
    stopListening,
    listening,
    supported: speechRecognitionSupported,
  }
}
