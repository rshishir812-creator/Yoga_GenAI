/**
 * Client-side Risk Signal Extractor
 *
 * Runs every frame in the browser — no backend call needed.
 * Detects: hyperextension, compensatory lean, tremor, breath-hold proxy.
 */
import type { Landmark } from '../api/client'
import type { RiskSignal } from '../types/health'

// ── Angle helper ───────────────────────────────────────────────────────────

function angle3(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y }
  const bc = { x: c.x - b.x, y: c.y - b.y }
  const dot = ba.x * bc.x + ba.y * bc.y
  const magA = Math.sqrt(ba.x ** 2 + ba.y ** 2)
  const magC = Math.sqrt(bc.x ** 2 + bc.y ** 2)
  if (magA === 0 || magC === 0) return 0
  const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magC)))
  return (Math.acos(cosAngle) * 180) / Math.PI
}

// ── Hyperextension check (single frame, stateless) ────────────────────────

function checkHyperextension(lm: Landmark[]): RiskSignal[] {
  const signals: RiskSignal[] = []
  if (lm.length < 33) return signals

  // Left knee hyperextension (angle > 185° approximation via <170°)
  const lKneeAngle = angle3(lm[23], lm[25], lm[27])
  if (lKneeAngle < 160) {
    signals.push({
      signal_type: 'hyperextension',
      severity: lKneeAngle < 150 ? 'high' : 'medium',
      body_part: 'left_knee',
      value: lKneeAngle,
      threshold: 160,
      frame_index: 0,
    })
  }

  // Right knee
  const rKneeAngle = angle3(lm[24], lm[26], lm[28])
  if (rKneeAngle < 160) {
    signals.push({
      signal_type: 'hyperextension',
      severity: rKneeAngle < 150 ? 'high' : 'medium',
      body_part: 'right_knee',
      value: rKneeAngle,
      threshold: 160,
      frame_index: 0,
    })
  }

  // Left elbow
  const lElbow = angle3(lm[11], lm[13], lm[15])
  if (lElbow > 185) {
    signals.push({
      signal_type: 'hyperextension',
      severity: 'medium',
      body_part: 'left_elbow',
      value: lElbow,
      threshold: 185,
      frame_index: 0,
    })
  }

  // Right elbow
  const rElbow = angle3(lm[12], lm[14], lm[16])
  if (rElbow > 185) {
    signals.push({
      signal_type: 'hyperextension',
      severity: 'medium',
      body_part: 'right_elbow',
      value: rElbow,
      threshold: 185,
      frame_index: 0,
    })
  }

  return signals
}

// ── Compensatory lean check (single frame) ────────────────────────────────

function checkCompensatoryLean(lm: Landmark[]): RiskSignal[] {
  if (lm.length < 33) return []
  const signals: RiskSignal[] = []

  // Torso lean: angle between shoulders midpoint and hips midpoint vs vertical
  const midShoulder = { x: (lm[11].x + lm[12].x) / 2, y: (lm[11].y + lm[12].y) / 2 }
  const midHip = { x: (lm[23].x + lm[24].x) / 2, y: (lm[23].y + lm[24].y) / 2 }

  const dx = midShoulder.x - midHip.x
  const dy = midShoulder.y - midHip.y
  const leanAngle = Math.abs(Math.atan2(dx, -dy) * 180 / Math.PI) // angle from vertical

  if (leanAngle > 25) {
    signals.push({
      signal_type: 'compensatory_lean',
      severity: leanAngle > 40 ? 'high' : 'medium',
      body_part: 'torso',
      value: leanAngle,
      threshold: 25,
      frame_index: 0,
    })
  }

  return signals
}

// ── Stateful detectors ─────────────────────────────────────────────────────

const TREMOR_HISTORY_SIZE = 10
const TREMOR_VELOCITY_THRESHOLD = 0.008  // normalised coords per frame
const TREMOR_CONSECUTIVE_REQUIRED = 5

const BREATH_HISTORY_SIZE = 90  // ~3 seconds at 30fps
const BREATH_OSCILLATION_THRESHOLD = 0.002

export class RiskSignalExtractor {
  private landmarkHistory: Landmark[][] = []
  private tremorConsecutive: number = 0
  private shoulderYHistory: number[] = []
  private frameIndex: number = 0

  reset(): void {
    this.landmarkHistory = []
    this.tremorConsecutive = 0
    this.shoulderYHistory = []
    this.frameIndex = 0
  }

  /**
   * Extract all risk signals from the current frame.
   * Call this every frame with the latest landmarks.
   */
  extract(landmarks: Landmark[]): RiskSignal[] {
    this.frameIndex++
    const signals: RiskSignal[] = []

    // Stateless checks
    signals.push(...checkHyperextension(landmarks))
    signals.push(...checkCompensatoryLean(landmarks))

    // Stateful: tremor detection
    if (this.landmarkHistory.length > 0) {
      const prev = this.landmarkHistory[this.landmarkHistory.length - 1]
      const tremor = this.checkTremor(prev, landmarks)
      if (tremor) signals.push(tremor)
    }

    // Stateful: breath hold proxy
    const breathSignal = this.checkBreathHold(landmarks)
    if (breathSignal) signals.push(breathSignal)

    // Update history
    this.landmarkHistory.push(landmarks)
    if (this.landmarkHistory.length > TREMOR_HISTORY_SIZE) {
      this.landmarkHistory.shift()
    }

    // Set frame index on all signals
    for (const s of signals) {
      s.frame_index = this.frameIndex
    }

    return signals
  }

  private checkTremor(prev: Landmark[], curr: Landmark[]): RiskSignal | null {
    if (prev.length < 33 || curr.length < 33) return null

    // Check velocity of key joints: wrists, ankles
    const joints = [15, 16, 27, 28] // l_wrist, r_wrist, l_ankle, r_ankle
    const jointNames = ['left_wrist', 'right_wrist', 'left_ankle', 'right_ankle']

    let maxVelocity = 0
    let maxJoint = ''

    for (let i = 0; i < joints.length; i++) {
      const idx = joints[i]
      const dx = curr[idx].x - prev[idx].x
      const dy = curr[idx].y - prev[idx].y
      const velocity = Math.sqrt(dx * dx + dy * dy)
      if (velocity > maxVelocity) {
        maxVelocity = velocity
        maxJoint = jointNames[i]
      }
    }

    if (maxVelocity > TREMOR_VELOCITY_THRESHOLD) {
      this.tremorConsecutive++
    } else {
      this.tremorConsecutive = 0
    }

    // Only report after 5 consecutive frames (false-positive mitigation)
    if (this.tremorConsecutive >= TREMOR_CONSECUTIVE_REQUIRED) {
      return {
        signal_type: 'tremor',
        severity: maxVelocity > TREMOR_VELOCITY_THRESHOLD * 3 ? 'high' : 'medium',
        body_part: maxJoint,
        value: maxVelocity,
        threshold: TREMOR_VELOCITY_THRESHOLD,
        frame_index: this.frameIndex,
      }
    }

    return null
  }

  private checkBreathHold(landmarks: Landmark[]): RiskSignal | null {
    if (landmarks.length < 33) return null

    // Track shoulder midpoint Y oscillation as breath proxy
    const shoulderY = (landmarks[11].y + landmarks[12].y) / 2
    this.shoulderYHistory.push(shoulderY)

    if (this.shoulderYHistory.length > BREATH_HISTORY_SIZE) {
      this.shoulderYHistory.shift()
    }

    // Need at least 2 seconds of data
    if (this.shoulderYHistory.length < 60) return null

    // Check oscillation range in the last 90 frames
    const recent = this.shoulderYHistory.slice(-BREATH_HISTORY_SIZE)
    const min = Math.min(...recent)
    const max = Math.max(...recent)
    const oscillation = max - min

    if (oscillation < BREATH_OSCILLATION_THRESHOLD) {
      return {
        signal_type: 'possible_breath_hold',
        severity: 'medium',
        body_part: 'chest',
        value: oscillation,
        threshold: BREATH_OSCILLATION_THRESHOLD,
        frame_index: this.frameIndex,
      }
    }

    return null
  }
}
