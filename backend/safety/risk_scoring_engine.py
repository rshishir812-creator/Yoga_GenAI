"""Risk Scoring Engine — maps signals to 0–100 session risk score.

Designed to run on the FRONTEND (ported to TypeScript) for real-time
performance. The Python version is the reference implementation used for
testing and the data-persistence write-back.

Signal weights, thresholds, and escalation levels are defined here and
mirrored in ``frontend/src/safety/riskScoringEngine.ts``.
"""
from __future__ import annotations

from safety.models import RiskSignal, SessionRiskScore, EscalationEvent
from datetime import datetime, timezone

# ── Signal weights ──────────────────────────────────────────────────────────
SIGNAL_WEIGHTS: dict[str, dict[str, int]] = {
    "tremor": {"low": 5, "medium": 12, "high": 20, "critical": 30},
    "hyperextension": {"low": 5, "medium": 10, "high": 18, "critical": 25},
    "compensatory_lean": {"low": 3, "medium": 8, "high": 15, "critical": 20},
    "possible_breath_hold": {"low": 3, "medium": 8, "high": 15, "critical": 22},
    "pain_reported": {"low": 10, "medium": 20, "high": 35, "critical": 50},
}

# ── Escalation thresholds ──────────────────────────────────────────────────
WARN_THRESHOLD = 30
PAUSE_THRESHOLD = 60
STOP_THRESHOLD = 85

# ── Decay rate (points per second of clean frames) ─────────────────────────
DECAY_PER_SECOND = 2.0

# ── Trainer-voice escalation messages ──────────────────────────────────────
ESCALATION_MESSAGES: dict[str, dict[str, str]] = {
    "warn": {
        "tremor": "I'm noticing some shaking in your {body_part}. Let's ease up a little — soften the effort.",
        "hyperextension": "Your {body_part} is extended quite far. Gently micro-bend to protect the joint.",
        "compensatory_lean": "Your body is compensating a bit. Try to redistribute your weight evenly.",
        "possible_breath_hold": "Remember to keep breathing smoothly — don't hold your breath.",
        "pain_reported": "Thank you for letting me know about the discomfort. Let's modify this pose.",
    },
    "pause": {
        "default": "Let's pause for a moment and come into a comfortable position. Take a few deep breaths.",
    },
    "stop": {
        "default": "I'd like you to gently come out of the pose and rest in Child's Pose or Savasana. Your body is telling us it needs a break.",
    },
}


class RiskScoringEngine:
    """Accumulates risk signals and produces a session risk score."""

    def __init__(self) -> None:
        self._score: float = 0.0
        self._last_signal_time: datetime | None = None
        self._contributing: list[str] = []

    @property
    def current_score(self) -> int:
        return min(100, max(0, int(self._score)))

    def reset(self) -> None:
        self._score = 0.0
        self._last_signal_time = None
        self._contributing = []

    def ingest_signals(
        self,
        signals: list[RiskSignal],
        session_id: str = "",
        pose_id: str = "",
        elapsed_seconds: float = 0.0,
    ) -> SessionRiskScore:
        """Ingest a batch of signals (one frame) and return updated score."""
        now = datetime.now(timezone.utc)

        # Apply decay based on time since last signal
        if self._last_signal_time and not signals:
            dt = (now - self._last_signal_time).total_seconds()
            self._score = max(0.0, self._score - DECAY_PER_SECOND * dt)

        # Add signal contributions
        for sig in signals:
            weight_map = SIGNAL_WEIGHTS.get(sig.signal_type, {})
            weight = weight_map.get(sig.severity, 5)
            self._score = min(100.0, self._score + weight)
            self._contributing.append(f"{sig.signal_type}:{sig.body_part}")

        if signals:
            self._last_signal_time = now

        # Keep contributing list manageable
        self._contributing = self._contributing[-20:]

        esc = self._get_escalation_level()

        return SessionRiskScore(
            session_id=session_id,
            pose_id=pose_id,
            score=self.current_score,
            escalation_level=esc,
            contributing_signals=list(set(self._contributing)),
            triggered_at=now if esc != "none" else None,
        )

    def _get_escalation_level(self) -> str:
        s = self.current_score
        if s >= STOP_THRESHOLD:
            return "stop"
        if s >= PAUSE_THRESHOLD:
            return "pause"
        if s >= WARN_THRESHOLD:
            return "warn"
        return "none"

    def build_escalation_event(
        self,
        session_id: str,
        signal: RiskSignal | None = None,
    ) -> EscalationEvent | None:
        """Build an escalation event if the current score warrants one."""
        level = self._get_escalation_level()
        if level == "none":
            return None

        # Pick trainer-voice message
        if level in ("pause", "stop"):
            reason = ESCALATION_MESSAGES[level]["default"]
        elif signal:
            template = ESCALATION_MESSAGES["warn"].get(
                signal.signal_type,
                "Let's take care with your alignment right now.",
            )
            reason = template.format(body_part=signal.body_part)
        else:
            reason = "Let's ease up a little and focus on your breath."

        safe_exit = "balasana" if level in ("pause", "stop") else None

        return EscalationEvent(
            session_id=session_id,
            event_type=level,
            reason=reason,
            safe_exit_pose=safe_exit,
            triggered_at=datetime.now(timezone.utc),
        )
