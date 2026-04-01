import { useCallback, useRef } from 'react'
import { synthesizeSpeech } from '../api/client'
import { POSE_DESCRIPTIONS } from '../data/poseDescriptions'

export type VoiceGender = 'male' | 'female'

export type VoiceLanguageCode = 'en-IN' | 'hi-IN' | 'kn-IN' | 'bn-IN' | 'mr-IN' | 'gu-IN'

export interface VoiceSettings {
  languageCode: VoiceLanguageCode
  rate: number          // 0.5 – 1.5  → maps to Cloud TTS speakingRate
  pitch: number         // 0.5 – 1.5  → mapped to semitones: (pitch - 1) * 20
  volume: number        // 0 – 1      → applied client-side on the Audio element
  gender: VoiceGender   // selects en-IN-Neural2-A (female) or en-IN-Neural2-B (male)
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  languageCode: 'en-IN',
  rate: 1.00,
  pitch: 1.05,
  volume: 0.92,
  gender: 'female',
}

export interface VoiceGuide {
  /** Speak text via Cloud TTS. onEnd fires when audio completes (or after 5 s if voice disabled). */
  speak: (text: string, onEnd?: () => void) => void
  /**
   * Rate-limited speak for live feedback (2 s min gap, skips duplicate text).
   * onEnd fires when audio completes.
   */
  speakFeedback: (text: string, onEnd?: () => void) => void
  /** Warm cache for known static prompts (best-effort, no playback). */
  prefetch: (texts: string[]) => void
  /** Cancel any in-progress audio. */
  cancel: () => void
}

// ── In-memory audio cache ──────────────────────────────────────────────────
// Key: `${lang}:${gender}:${rate}:${pitch}:${text}` → Value: Blob (MP3)
const audioCache = new Map<string, Blob>()
const MAX_CACHE = 50

// ── Persistent audio cache (IndexedDB) ─────────────────────────────────────
// Survives page refreshes and greatly reduces repeated TTS/Translate calls.
const VOICE_CACHE_DB_NAME = 'oorjakull-voice-cache'
const VOICE_CACHE_DB_VERSION = 1
const VOICE_CACHE_STORE = 'audio'
const VOICE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

type PersistentAudioRecord = {
  key: string
  blob: Blob
  updatedAt: number
}

let cleanupInFlight = false
let lastCleanupTs = 0

function hasIndexedDbSupport(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function openVoiceCacheDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDbSupport()) return Promise.resolve(null)

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(VOICE_CACHE_DB_NAME, VOICE_CACHE_DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(VOICE_CACHE_STORE)) {
          db.createObjectStore(VOICE_CACHE_STORE, { keyPath: 'key' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function getPersistentAudio(key: string): Promise<Blob | null> {
  const db = await openVoiceCacheDb()
  if (!db) return null

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(VOICE_CACHE_STORE, 'readonly')
      const store = tx.objectStore(VOICE_CACHE_STORE)
      const req = store.get(key)

      req.onsuccess = () => {
        const rec = req.result as PersistentAudioRecord | undefined
        if (!rec || !rec.blob) {
          resolve(null)
          return
        }

        const expired = Date.now() - rec.updatedAt > VOICE_CACHE_TTL_MS
        if (expired) {
          void deletePersistentAudio(key)
          resolve(null)
          return
        }

        resolve(rec.blob)
      }

      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function setPersistentAudio(key: string, blob: Blob): Promise<void> {
  const db = await openVoiceCacheDb()
  if (!db) return

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(VOICE_CACHE_STORE, 'readwrite')
      const store = tx.objectStore(VOICE_CACHE_STORE)
      const rec: PersistentAudioRecord = {
        key,
        blob,
        updatedAt: Date.now(),
      }
      store.put(rec)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    } catch {
      resolve()
    }
  })

  void cleanupExpiredPersistentAudio()
}

async function deletePersistentAudio(key: string): Promise<void> {
  const db = await openVoiceCacheDb()
  if (!db) return

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(VOICE_CACHE_STORE, 'readwrite')
      tx.objectStore(VOICE_CACHE_STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    } catch {
      resolve()
    }
  })
}

async function cleanupExpiredPersistentAudio(): Promise<void> {
  const now = Date.now()
  if (cleanupInFlight) return
  if (now - lastCleanupTs < 1000 * 60 * 60) return // run at most once/hour

  cleanupInFlight = true
  lastCleanupTs = now

  try {
    const db = await openVoiceCacheDb()
    if (!db) return

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(VOICE_CACHE_STORE, 'readwrite')
        const store = tx.objectStore(VOICE_CACHE_STORE)
        const req = store.openCursor()

        req.onsuccess = () => {
          const cursor = req.result
          if (!cursor) return

          const rec = cursor.value as PersistentAudioRecord
          if (now - rec.updatedAt > VOICE_CACHE_TTL_MS) {
            cursor.delete()
          }
          cursor.continue()
        }

        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
        tx.onabort = () => resolve()
      } catch {
        resolve()
      }
    })
  } finally {
    cleanupInFlight = false
  }
}

type Replacement = { from: string; to: string }

const POSE_NAME_REPLACEMENTS: Replacement[] = (() => {
  const pairs: Replacement[] = []
  const seen = new Set<string>()

  for (const poseKey of Object.keys(POSE_DESCRIPTIONS)) {
    const desc = POSE_DESCRIPTIONS[poseKey]
    if (!desc?.sanskritName) continue

    // Replace the pose key itself (often used across the app)
    if (poseKey && !seen.has(poseKey)) {
      pairs.push({ from: poseKey, to: desc.sanskritName })
      seen.add(poseKey)
    }

    // Replace the English display name when available
    if (desc.englishName && !seen.has(desc.englishName)) {
      pairs.push({ from: desc.englishName, to: desc.sanskritName })
      seen.add(desc.englishName)
    }
  }

  // Longer first to avoid partial overlaps (e.g., "Warrior" inside "Warrior II")
  pairs.sort((a, b) => b.from.length - a.from.length)
  return pairs
})()

function normalizePoseNamesToSanskrit(text: string): string {
  if (!text) return text
  let output = text
  for (const { from, to } of POSE_NAME_REPLACEMENTS) {
    if (from && output.includes(from)) {
      output = output.split(from).join(to)
    }
  }
  return output
}

function cacheKey(text: string, languageCode: string, gender: VoiceGender, rate: number, pitch: number): string {
  return `${languageCode}:${gender}:${rate.toFixed(2)}:${pitch.toFixed(2)}:${text}`
}

function cacheSet(key: string, blob: Blob) {
  if (audioCache.size >= MAX_CACHE) {
    // Evict oldest entry
    const firstKey = audioCache.keys().next().value
    if (firstKey !== undefined) audioCache.delete(firstKey)
  }
  audioCache.set(key, blob)
}

// ── Resolve the backend base URL (same logic as App.tsx) ───────────────────
function getBaseUrl(): string {
  return (
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/api\/?$/, '').replace(/\/$/, '') ??
    'http://localhost:8000'
  )
}

export function useVoiceGuide(
  voiceEnabled: boolean,
  settings: VoiceSettings = DEFAULT_VOICE_SETTINGS,
): VoiceGuide {
  const lastSpokenRef = useRef<string>('')
  const lastSpeakTsRef = useRef<number>(0)
  const silentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const currentObjectUrlRef = useRef<string | null>(null)

  /** Stop currently-playing audio and revoke its object URL. */
  const stopAudio = useCallback(() => {
    const audio = currentAudioRef.current
    if (audio) {
      audio.pause()
      audio.onended = null
      audio.onerror = null
      currentAudioRef.current = null
    }
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current)
      currentObjectUrlRef.current = null
    }
  }, [])

  /** Play a Blob and call onEnd when it finishes. */
  const playBlob = useCallback(
    (blob: Blob, volume: number, onEnd?: () => void) => {
      stopAudio()
      const url = URL.createObjectURL(blob)
      currentObjectUrlRef.current = url
      const audio = new Audio(url)
      audio.volume = volume
      currentAudioRef.current = audio
      audio.onended = () => {
        stopAudio()
        onEnd?.()
      }
      audio.onerror = () => {
        stopAudio()
        onEnd?.()
      }
      audio.play().catch(() => {
        stopAudio()
        onEnd?.()
      })
    },
    [stopAudio],
  )

  const fetchAudioBlob = useCallback(
    async (text: string): Promise<Blob> => {
      const normalizedText = normalizePoseNamesToSanskrit(text)
      const key = cacheKey(normalizedText, settings.languageCode, settings.gender, settings.rate, settings.pitch)

      // 1) Fast in-memory cache
      const inMemory = audioCache.get(key)
      if (inMemory) return inMemory

      // 2) Persistent cache
      const persisted = await getPersistentAudio(key)
      if (persisted) {
        cacheSet(key, persisted)
        return persisted
      }

      // 3) Network fallback
      const pitchSemitones = (settings.pitch - 1.0) * 20.0
      const blob = await synthesizeSpeech({
        baseUrl: getBaseUrl(),
        text: normalizedText,
        languageCode: settings.languageCode,
        gender: settings.gender,
        speed: settings.rate,
        pitch: pitchSemitones,
      })

      cacheSet(key, blob)
      // Best-effort persistent write. Ignore quota/IDB errors.
      void setPersistentAudio(key, blob)
      return blob
    },
    [settings],
  )

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      // Clear any pending silent timer
      if (silentTimerRef.current !== null) {
        clearTimeout(silentTimerRef.current)
        silentTimerRef.current = null
      }

      // Stop any currently-playing audio
      stopAudio()

      if (!voiceEnabled) {
        // When voice is off, fire onEnd after 5 s so the app flow continues
        if (onEnd) {
          silentTimerRef.current = setTimeout(() => {
            silentTimerRef.current = null
            onEnd()
          }, 5000)
        }
        return
      }

      void (async () => {
        try {
          const blob = await fetchAudioBlob(text)
          playBlob(blob, settings.volume, onEnd)
        } catch {
          // TTS failed — fire onEnd after a short delay so app flow isn't stuck
          if (onEnd) {
            silentTimerRef.current = setTimeout(() => {
              silentTimerRef.current = null
              onEnd()
            }, 2000)
          }
        }
      })()
    },
    [voiceEnabled, settings, stopAudio, playBlob, fetchAudioBlob],
  )

  const speakFeedback = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!voiceEnabled || !text) {
        onEnd?.()
        return
      }

      const normalizedText = normalizePoseNamesToSanskrit(text)
      const now = Date.now()
      if (normalizedText === lastSpokenRef.current) {
        onEnd?.()
        return
      }
      if (now - lastSpeakTsRef.current < 2000) {
        onEnd?.()
        return
      }

      lastSpokenRef.current = normalizedText
      lastSpeakTsRef.current = now

      // Reuse speak() which handles caching, audio playback, and error fallback
      speak(normalizedText, onEnd)
    },
    [voiceEnabled, speak],
  )

  const prefetch = useCallback(
    (texts: string[]) => {
      if (!voiceEnabled || !texts.length) return

      const uniqueTexts = Array.from(new Set(texts.map((t) => t.trim()).filter(Boolean)))

      void (async () => {
        for (const text of uniqueTexts) {
          try {
            await fetchAudioBlob(text)
          } catch {
            // best-effort cache warmup
          }
        }
      })()
    },
    [voiceEnabled, fetchAudioBlob],
  )

  const cancel = useCallback(() => {
    if (silentTimerRef.current !== null) {
      clearTimeout(silentTimerRef.current)
      silentTimerRef.current = null
    }
    stopAudio()
  }, [stopAudio])

  return { speak, speakFeedback, prefetch, cancel }
}
