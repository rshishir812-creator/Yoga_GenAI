/**
 * Client-side Risk Scoring Engine
 *
 * Mirrors the backend ``safety/risk_scoring_engine.py`` reference implementation.
 * Runs entirely in the browser for real-time performance.
 */
import type { RiskSignal, EscalationLevel, EscalationEvent } from '../types/health'

// ── Signal weights ─────────────────────────────────────────────────────────

const SIGNAL_WEIGHTS: Record<string, Record<string, number>> = {
  tremor:              { low: 5, medium: 12, high: 20, critical: 30 },
  hyperextension:      { low: 5, medium: 10, high: 18, critical: 25 },
  compensatory_lean:   { low: 3, medium: 8,  high: 15, critical: 20 },
  possible_breath_hold:{ low: 3, medium: 8,  high: 15, critical: 22 },
  pain_reported:       { low: 10, medium: 20, high: 35, critical: 50 },
}

// ── Thresholds ─────────────────────────────────────────────────────────────

const WARN_THRESHOLD = 30
const PAUSE_THRESHOLD = 60
const STOP_THRESHOLD = 85

// ── Decay ──────────────────────────────────────────────────────────────────

const DECAY_PER_SECOND = 2.0

// ── Trainer-voice messages ─────────────────────────────────────────────────

const WARN_MESSAGES: Record<string, string> = {
  tremor: "I'm noticing some shaking in your {body_part}. Let's ease up a little — soften the effort.",
  hyperextension: 'Your {body_part} is extended quite far. Gently micro-bend to protect the joint.',
  compensatory_lean: 'Your body is compensating a bit. Try to redistribute your weight evenly.',
  possible_breath_hold: "Remember to keep breathing smoothly — don't hold your breath.",
  pain_reported: "Thank you for letting me know about the discomfort. Let's modify this pose.",
}

const PAUSE_MESSAGE = "Let's pause for a moment and come into a comfortable position. Take a few deep breaths."
const STOP_MESSAGE = "I'd like you to gently come out of the pose and rest in Child's Pose or Savasana. Your body is telling us it needs a break."

export class RiskScoringEngine {
  private _score = 0
  private _lastSignalTime: number | null = null
  private _contributing: string[] = []

  get currentScore(): number {
    return Math.min(100, Math.max(0, Math.round(this._score)))
  }

  get escalationLevel(): EscalationLevel {
    const s = this.currentScore
    if (s >= STOP_THRESHOLD) return 'stop'
    if (s >= PAUSE_THRESHOLD) return 'pause'
    if (s >= WARN_THRESHOLD) return 'warn'
    return 'none'
  }

  reset(): void {
    this._score = 0
    this._lastSignalTime = null
    this._contributing = []
  }

  /**
   * Ingest a batch of signals (one frame) and return the current risk score + escalation.
   */
  ingestSignals(signals: RiskSignal[], _sessionId: string, _poseId: string): {
    score: number
    escalation: EscalationLevel
    contributing: string[]
  } {
    const now = Date.now()

    // Decay if no signals
    if (this._lastSignalTime && signals.length === 0) {
      const dt = (now - this._lastSignalTime) / 1000
      this._score = Math.max(0, this._score - DECAY_PER_SECOND * dt)
    }

    // Add signal contributions
    for (const sig of signals) {
      const weights = SIGNAL_WEIGHTS[sig.signal_type] ?? {}
      const w = weights[sig.severity] ?? 5
      this._score = Math.min(100, this._score + w)
      this._contributing.push(`${sig.signal_type}:${sig.body_part}`)
    }

    if (signals.length > 0) {
      this._lastSignalTime = now
    }

    // Keep list manageable
    if (this._contributing.length > 20) {
      this._contributing = this._contributing.slice(-20)
    }

    return {
      score: this.currentScore,
      escalation: this.escalationLevel,
      contributing: [...new Set(this._contributing)],
    }
  }

  /**
   * Build an escalation event if warranted.
   */
  buildEscalationEvent(sessionId: string, latestSignal?: RiskSignal): EscalationEvent | null {
    const level = this.escalationLevel
    if (level === 'none') return null

    let reason: string
    if (level === 'stop') {
      reason = STOP_MESSAGE
    } else if (level === 'pause') {
      reason = PAUSE_MESSAGE
    } else if (latestSignal) {
      const template = WARN_MESSAGES[latestSignal.signal_type] ?? "Let's ease up a little and focus on your breath."
      reason = template.replace('{body_part}', latestSignal.body_part.replace('_', ' '))
    } else {
      reason = "Let's ease up a little and focus on your breath."
    }

    return {
      session_id: sessionId,
      event_type: level as 'warn' | 'pause' | 'stop',
      reason,
      safe_exit_pose: level === 'stop' || level === 'pause' ? 'balasana' : null,
      triggered_at: new Date().toISOString(),
    }
  }

  /**
   * Inject a pain report signal.
   */
  reportPain(level: 'mild' | 'moderate' | 'severe'): void {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      mild: 'low',
      moderate: 'medium',
      severe: 'critical',
    }
    const sig: RiskSignal = {
      signal_type: 'pain_reported',
      severity: severityMap[level] ?? 'medium',
      body_part: 'general',
      value: null,
      threshold: null,
      frame_index: 0,
    }
    this.ingestSignals([sig], '', '')
  }
}
