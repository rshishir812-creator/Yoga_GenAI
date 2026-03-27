"""Pydantic models for the safety architecture.

All inter-layer communication uses these contracts.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ── Health Questionnaire Input ──────────────────────────────────────────────

MedicalCondition = Literal[
    "high_bp", "low_bp", "heart_condition", "diabetes",
    "thyroid", "respiratory", "joint_arthritis", "back_slip_disc",
    "knee_pain", "recent_injury_surgery", "hip_injury",
    "sciatica", "ankle_injury", "vertigo", "none",
]

ActivitySymptom = Literal[
    "dizziness_fainting", "shortness_of_breath",
    "chest_pain", "severe_fatigue", "none",
]

MobilityRestriction = Literal[
    "difficulty_bending_forward", "difficulty_bending_backward",
    "limited_shoulder_rotation", "limited_hip_rotation",
    "balance_issues", "none",
]

PainArea = Literal[
    "lower_back", "upper_back", "neck",
    "left_knee", "right_knee",
    "left_hip", "right_hip",
    "left_shoulder", "right_shoulder",
    "left_ankle", "right_ankle",
    "wrists", "none",
]


class UserHealthInput(BaseModel):
    """Data collected from the health questionnaire (all 5 steps)."""

    # Step 1 — Medical conditions
    medical_conditions: list[MedicalCondition] = Field(
        default_factory=list,
        description="Known medical conditions from the questionnaire.",
    )

    # Step 2 — Activity symptoms
    activity_symptoms: list[ActivitySymptom] = Field(
        default_factory=list,
        description="Symptoms during physical activity.",
    )

    # Step 3 — Mobility restrictions
    mobility_restrictions: list[MobilityRestriction] = Field(
        default_factory=list,
        description="Physical mobility limitations.",
    )

    # Step 4 — Current pain (refreshed every session)
    current_pain_areas: list[PainArea] = Field(
        default_factory=list,
        description="Pain locations reported at session start.",
    )
    current_pain_level: int = Field(
        default=0, ge=0, le=10,
        description="0–10 numeric rating scale for current pain.",
    )

    # Step 5 — Pregnancy / surgery
    is_pregnant: bool = Field(
        default=False,
        description="Whether the user is currently pregnant.",
    )
    recent_surgery_or_injury: bool = Field(
        default=False,
        description="Whether the user had recent surgery or injury.",
    )
    recent_surgery_details: str | None = Field(
        default=None,
        description="Free-text details about recent surgery (optional).",
    )

    # Meta
    consent_given: bool = Field(
        default=False,
        description="Must be True before any session can start.",
    )


# ── User Risk Profile ──────────────────────────────────────────────────────

class UserRiskProfile(BaseModel):
    """Computed safety profile persisted per-user, refreshed on every questionnaire update."""

    user_id: str = Field(description="UUID of the user in the users table.")
    risk_tier: Literal["low", "moderate", "high", "do_not_practice"] = Field(
        description="Overall risk classification.",
    )

    # Condition flags (derived from questionnaire)
    has_cardiovascular_risk: bool = Field(default=False, description="high_bp / heart_condition / low_bp")
    has_spinal_sensitivity: bool = Field(default=False, description="back_slip_disc / sciatica")
    has_lower_limb_sensitivity: bool = Field(default=False, description="knee_pain / hip_injury / ankle_injury")
    has_balance_disorder: bool = Field(default=False, description="vertigo / balance_issues")
    has_respiratory_condition: bool = Field(default=False, description="respiratory condition present")
    is_pregnant: bool = Field(default=False, description="Currently pregnant")
    has_recent_injury: bool = Field(default=False, description="Recent surgery or injury")

    # Session-level (refreshed each session)
    current_pain_level: int = Field(default=0, ge=0, le=10, description="0–10 NRS")
    current_pain_areas: list[str] = Field(default_factory=list, description="Active pain locations")

    # Pose-level gates (computed by SafetyProfiler)
    blocked_pose_ids: list[str] = Field(
        default_factory=list,
        description="Pose IDs that are completely blocked for this user.",
    )
    modified_pose_ids: dict[str, str] = Field(
        default_factory=dict,
        description="pose_id → modification instruction text.",
    )
    advisory_pose_ids: list[str] = Field(
        default_factory=list,
        description="Pose IDs that should show a warning before starting.",
    )

    # Hold-time reduction factor (1.0 = no reduction)
    max_hold_factor: float = Field(
        default=1.0, ge=0.0, le=1.0,
        description="Multiply all hold_seconds by this factor.",
    )

    # Meta
    consent_given: bool = Field(default=False)
    consent_timestamp: datetime | None = Field(default=None)
    profile_version: int = Field(default=1, description="Incremented on every update.")


# ── Risk Signals (real-time) ────────────────────────────────────────────────

class RiskSignal(BaseModel):
    """A single safety signal extracted from landmark analysis."""

    signal_type: Literal[
        "tremor", "hyperextension", "compensatory_lean",
        "possible_breath_hold", "pain_reported",
    ] = Field(description="Category of risk signal.")
    severity: Literal["low", "medium", "high", "critical"] = Field(
        description="How severe the signal is.",
    )
    body_part: str = Field(description="Which body part is affected.")
    value: float | None = Field(default=None, description="Measured value (angle, velocity, etc.)")
    threshold: float | None = Field(default=None, description="Threshold that was exceeded.")
    frame_index: int = Field(default=0, description="Frame number when signal was detected.")


# ── Session Risk Score ──────────────────────────────────────────────────────

class SessionRiskScore(BaseModel):
    """Running risk score for the current session."""

    session_id: str = Field(description="UUID of the session.")
    pose_id: str = Field(default="", description="Current pose being evaluated.")
    score: int = Field(default=0, ge=0, le=100, description="0 (safe) → 100 (critical)")
    escalation_level: Literal["none", "warn", "pause", "stop"] = Field(default="none")
    contributing_signals: list[str] = Field(
        default_factory=list,
        description="Human-readable signal names.",
    )
    triggered_at: datetime | None = Field(default=None)


# ── Escalation Events ──────────────────────────────────────────────────────

class EscalationEvent(BaseModel):
    """Fired when a risk threshold is crossed during a session."""

    session_id: str = Field(description="UUID of the session.")
    event_type: Literal["warn", "pause", "stop"] = Field(description="Escalation level.")
    reason: str = Field(description="Trainer-voice message shown to the user.")
    safe_exit_pose: str | None = Field(
        default=None,
        description="Suggested restorative pose for the user.",
    )
    triggered_at: datetime | None = Field(default=None)


# ── Session Plan ────────────────────────────────────────────────────────────

class PosePlanItem(BaseModel):
    """A single pose in a session plan, adjusted for safety."""

    pose_id: str
    name_en: str
    hold_seconds: int = Field(description="Adjusted hold time for this user.")
    modification: str | None = Field(default=None, description="Safety modification to show.")
    advisory: str | None = Field(default=None, description="Warning text if applicable.")
    is_substituted: bool = Field(default=False, description="Was this pose swapped in?")
    original_pose_id: str | None = Field(default=None, description="If substituted, what was removed.")


class SessionPlan(BaseModel):
    """The full plan for a yoga session, filtered through the safety layer."""

    session_id: str
    flow_id: str
    user_id: str
    risk_tier: str = Field(default="low", description="User's risk tier at plan creation time.")
    risk_profile_version: int = Field(default=1)
    poses: list[PosePlanItem]
    warnings: list[str] = Field(default_factory=list, description="Shown on the briefing screen.")
    estimated_duration_minutes: int = Field(default=0)
    created_at: datetime | None = Field(default=None)
