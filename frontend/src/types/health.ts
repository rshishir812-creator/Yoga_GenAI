/**
 * Safety architecture types — mirrors backend safety/models.py
 */

export type MedicalCondition =
  | 'high_bp' | 'low_bp' | 'heart_condition' | 'diabetes'
  | 'thyroid' | 'respiratory' | 'joint_arthritis' | 'back_slip_disc'
  | 'knee_pain' | 'recent_injury_surgery' | 'hip_injury'
  | 'sciatica' | 'ankle_injury' | 'vertigo' | 'none'

export type ActivitySymptom =
  | 'dizziness_fainting' | 'shortness_of_breath'
  | 'chest_pain' | 'severe_fatigue' | 'none'

export type MobilityRestriction =
  | 'difficulty_bending_forward' | 'difficulty_bending_backward'
  | 'limited_shoulder_rotation' | 'limited_hip_rotation'
  | 'balance_issues' | 'none'

export type PainArea =
  | 'lower_back' | 'upper_back' | 'neck'
  | 'left_knee' | 'right_knee'
  | 'left_hip' | 'right_hip'
  | 'left_shoulder' | 'right_shoulder'
  | 'left_ankle' | 'right_ankle'
  | 'wrists' | 'none'

export type RiskTier = 'low' | 'moderate' | 'high' | 'do_not_practice'

export type EscalationLevel = 'none' | 'warn' | 'pause' | 'stop'

export interface UserHealthInput {
  medical_conditions: MedicalCondition[]
  activity_symptoms: ActivitySymptom[]
  mobility_restrictions: MobilityRestriction[]
  current_pain_areas: PainArea[]
  current_pain_level: number
  is_pregnant: boolean
  recent_surgery_or_injury: boolean
  recent_surgery_details: string | null
  consent_given: boolean
}

export interface UserRiskProfile {
  user_id: string
  risk_tier: RiskTier
  has_cardiovascular_risk: boolean
  has_spinal_sensitivity: boolean
  has_lower_limb_sensitivity: boolean
  has_balance_disorder: boolean
  has_respiratory_condition: boolean
  is_pregnant: boolean
  has_recent_injury: boolean
  current_pain_level: number
  current_pain_areas: string[]
  blocked_pose_ids: string[]
  modified_pose_ids: Record<string, string>
  advisory_pose_ids: string[]
  max_hold_factor: number
  consent_given: boolean
  consent_timestamp: string | null
  profile_version: number
}

export interface PosePlanItem {
  pose_id: string
  name_en: string
  hold_seconds: number
  modification: string | null
  advisory: string | null
  is_substituted: boolean
  original_pose_id: string | null
}

export interface SessionPlan {
  session_id: string
  flow_id: string
  user_id: string
  risk_tier: string
  risk_profile_version: number
  poses: PosePlanItem[]
  warnings: string[]
  estimated_duration_minutes: number
  created_at: string | null
}

export interface RiskSignal {
  signal_type: 'tremor' | 'hyperextension' | 'compensatory_lean' | 'possible_breath_hold' | 'pain_reported'
  severity: 'low' | 'medium' | 'high' | 'critical'
  body_part: string
  value: number | null
  threshold: number | null
  frame_index: number
}

export interface SessionRiskScore {
  session_id: string
  pose_id: string
  score: number
  escalation_level: EscalationLevel
  contributing_signals: string[]
  triggered_at: string | null
}

export interface EscalationEvent {
  session_id: string
  event_type: 'warn' | 'pause' | 'stop'
  reason: string
  safe_exit_pose: string | null
  triggered_at: string | null
}

// ── Questionnaire step configs ─────────────────────────────────────────────

export interface ConditionOption {
  value: string
  label: string
  description?: string
}

export const MEDICAL_CONDITIONS: ConditionOption[] = [
  { value: 'high_bp', label: 'High Blood Pressure', description: 'Hypertension, currently treated or untreated' },
  { value: 'low_bp', label: 'Low Blood Pressure', description: 'Hypotension or frequent lightheadedness' },
  { value: 'heart_condition', label: 'Heart Condition', description: 'Any diagnosed cardiac condition' },
  { value: 'diabetes', label: 'Diabetes', description: 'Type 1 or Type 2' },
  { value: 'thyroid', label: 'Thyroid Disorder', description: 'Hypo or hyperthyroidism' },
  { value: 'respiratory', label: 'Respiratory Condition', description: 'Asthma, COPD, or similar' },
  { value: 'joint_arthritis', label: 'Joint / Arthritis', description: 'Chronic joint inflammation' },
  { value: 'back_slip_disc', label: 'Back / Slipped Disc', description: 'Herniated or bulging disc' },
  { value: 'knee_pain', label: 'Knee Pain', description: 'Chronic or recurring knee issues' },
  { value: 'hip_injury', label: 'Hip Injury', description: 'Hip replacement or chronic hip issue' },
  { value: 'sciatica', label: 'Sciatica', description: 'Sciatic nerve pain' },
  { value: 'ankle_injury', label: 'Ankle Injury', description: 'Sprained or unstable ankle' },
  { value: 'vertigo', label: 'Vertigo / Dizziness', description: 'Balance disorder or BPPV' },
  { value: 'none', label: 'None of the above' },
]

export const ACTIVITY_SYMPTOMS: ConditionOption[] = [
  { value: 'dizziness_fainting', label: 'Dizziness or Fainting', description: 'During or after exercise' },
  { value: 'shortness_of_breath', label: 'Shortness of Breath', description: 'Unusual breathlessness during mild activity' },
  { value: 'chest_pain', label: 'Chest Pain', description: 'During physical activity' },
  { value: 'severe_fatigue', label: 'Severe Fatigue', description: 'Extreme tiredness during mild exercise' },
  { value: 'none', label: 'None of the above' },
]

export const MOBILITY_RESTRICTIONS: ConditionOption[] = [
  { value: 'difficulty_bending_forward', label: 'Difficulty Bending Forward' },
  { value: 'difficulty_bending_backward', label: 'Difficulty Bending Backward' },
  { value: 'limited_shoulder_rotation', label: 'Limited Shoulder Rotation' },
  { value: 'limited_hip_rotation', label: 'Limited Hip Rotation' },
  { value: 'balance_issues', label: 'Balance Issues', description: 'Difficulty standing on one foot' },
  { value: 'none', label: 'None of the above' },
]

export const PAIN_AREAS: ConditionOption[] = [
  { value: 'lower_back', label: 'Lower Back' },
  { value: 'upper_back', label: 'Upper Back' },
  { value: 'neck', label: 'Neck' },
  { value: 'left_knee', label: 'Left Knee' },
  { value: 'right_knee', label: 'Right Knee' },
  { value: 'left_hip', label: 'Left Hip' },
  { value: 'right_hip', label: 'Right Hip' },
  { value: 'left_shoulder', label: 'Left Shoulder' },
  { value: 'right_shoulder', label: 'Right Shoulder' },
  { value: 'left_ankle', label: 'Left Ankle' },
  { value: 'right_ankle', label: 'Right Ankle' },
  { value: 'wrists', label: 'Wrists' },
  { value: 'none', label: 'No Pain' },
]

export function createDefaultHealthInput(): UserHealthInput {
  return {
    medical_conditions: [],
    activity_symptoms: [],
    mobility_restrictions: [],
    current_pain_areas: [],
    current_pain_level: 0,
    is_pregnant: false,
    recent_surgery_or_injury: false,
    recent_surgery_details: null,
    consent_given: false,
  }
}
