export type ExpectedPose = string
export type UserLevel = 'beginner' | 'intermediate' | 'advanced'

export type FocusArea = 'front_knee' | 'back_leg' | 'arms' | 'torso' | 'hips' | 'balance' | 'none'
export type Severity = 'minor' | 'moderate' | 'major'

export type Deviation = {
  issue: string
  joint_or_area: string
  measured_value: number
  ideal_range: string
  severity: Severity
}

export type AlignmentResponse = {
  pose_match: 'aligned' | 'partially_aligned' | 'misaligned'
  confidence: 'high' | 'medium' | 'low'
  primary_focus_area: FocusArea
  deviations: Deviation[]
  correction_message: string
  score?: number | null
  /** 3-5 plain-English improvement instructions */
  correction_bullets: string[]
  /** One sentence on what the student is doing right */
  positive_observation: string
  /** Breath guidance for this moment in the pose */
  breath_cue: string
  /** Safety caution if a joint is severely misaligned, otherwise null */
  safety_note: string | null
}

export type Landmark = { x: number; y: number; z: number; visibility: number }

export type TrainMediaKind = 'image' | 'video'

export type TrainMedia = {
  kind: TrainMediaKind
  src: string
  filename: string
}

export type TrainPose = {
  pose: string
  media: TrainMedia[]
}

export type BreathEffect = 'increase' | 'decrease' | 'steady'
export type BreathAnimation = 'expand' | 'hold' | 'contract' | 'pulse'

export type BreathworkPhase = {
  label: string
  duration_sec: number
  instruction: string
  animation: BreathAnimation
}

export type BreathworkProtocol = {
  id: string
  name: string
  category: string
  tagline: string
  duration_mins: number
  description: string
  origin: string
  benefits: string[]
  effects: {
    hr: BreathEffect
    hrv: BreathEffect
    temperature: BreathEffect | null
  }
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  phases: BreathworkPhase[]
  cycles: number
}

export async function fetchTrainPoses(params: { baseUrl: string }): Promise<TrainPose[]> {
  const res = await fetch(`${params.baseUrl}/api/train/poses`)
  if (!res.ok) return []

  const data = (await res.json()) as { poses?: TrainPose[] }
  return Array.isArray(data.poses) ? data.poses : []
}

export async function fetchBreathworkProtocols(params: { baseUrl: string }): Promise<BreathworkProtocol[]> {
  const res = await fetch(`${params.baseUrl}/api/breathwork/protocols`)
  if (!res.ok) {
    throw new Error(`Failed to load breathwork protocols: ${res.status}`)
  }

  return (await res.json()) as BreathworkProtocol[]
}

export async function evaluateAlignment(params: {
  baseUrl: string
  clientId: string
  expectedPose: ExpectedPose
  userLevel: UserLevel
  landmarks: Landmark[]
}): Promise<AlignmentResponse> {
  const res = await fetch(`${params.baseUrl}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: params.clientId,
      expected_pose: params.expectedPose,
      user_level: params.userLevel,
      landmarks: params.landmarks
    })
  })

  if (!res.ok) {
    throw new Error(`Backend error: ${res.status}`)
  }

  return (await res.json()) as AlignmentResponse
}

/**
 * Call the backend Cloud TTS endpoint and return an audio Blob (MP3).
 * Throws on network or API errors.
 */
export async function synthesizeSpeech(params: {
  baseUrl: string
  text: string
  gender: 'male' | 'female'
  speed: number
  pitch: number
}): Promise<Blob> {
  const res = await fetch(`${params.baseUrl}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: params.text,
      gender: params.gender,
      speed: params.speed,
      pitch: params.pitch,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => 'Unknown error')
    throw new Error(`TTS error ${res.status}: ${detail}`)
  }

  return res.blob()
}
/**
 * Call the backend assistant endpoint and get a conversational response from Madhu.
 * Optionally include conversation history for context.
 */
export async function callAssistant(params: {
  baseUrl: string
  message: string
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<string> {
  const res = await fetch(`${params.baseUrl}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      messages: params.messages || [],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => 'Unknown error')
    throw new Error(`Assistant error ${res.status}: ${detail}`)
  }

  const data = (await res.json()) as { reply: string }
  return data.reply
}