"""Progression Service — provides user stats and session history summaries.

Data Layer 7: Learning and adaptation over time.
"""
from __future__ import annotations

from app.core.db import get_supabase


class ProgressionService:
    """Reads session history to provide progression data and carry-over risk."""

    def get_last_session_risk_score(self, user_id: str) -> int:
        """Return the final risk score from the user's most recent completed session.

        Returns 0 if no sessions exist.
        """
        sb = get_supabase()
        result = (
            sb.table("session_logs")
            .select("final_risk_score")
            .eq("user_id", user_id)
            .eq("state", "completed")
            .order("ended_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0].get("final_risk_score", 0)
        return 0

    def get_user_progression(self, user_id: str) -> dict:
        """Return a summary of the user's yoga journey."""
        sb = get_supabase()

        # Total sessions
        sessions = (
            sb.table("session_logs")
            .select("id, final_risk_score, duration_seconds, started_at")
            .eq("user_id", user_id)
            .eq("state", "completed")
            .order("started_at", desc=True)
            .limit(50)
            .execute()
        )
        session_data = sessions.data or []

        total_sessions = len(session_data)
        total_practice_minutes = sum(
            (s.get("duration_seconds", 0) or 0) for s in session_data
        ) // 60

        # Average risk score trend (last 5 sessions)
        last_5 = session_data[:5]
        avg_risk = (
            sum(s.get("final_risk_score", 0) for s in last_5) // max(1, len(last_5))
            if last_5
            else 0
        )

        # Pose attempts
        if session_data:
            session_ids = [s["id"] for s in session_data[:10]]
            attempts = (
                sb.table("pose_attempt_logs")
                .select("pose_id, peak_score, completed")
                .in_("session_id", session_ids)
                .execute()
            )
            attempt_data = attempts.data or []
        else:
            attempt_data = []

        # Aggregate pose stats
        pose_stats: dict[str, dict] = {}
        for a in attempt_data:
            pid = a.get("pose_id", "")
            if pid not in pose_stats:
                pose_stats[pid] = {"attempts": 0, "best_score": 0, "completions": 0}
            pose_stats[pid]["attempts"] += 1
            peak = a.get("peak_score", 0) or 0
            if peak > pose_stats[pid]["best_score"]:
                pose_stats[pid]["best_score"] = peak
            if a.get("completed"):
                pose_stats[pid]["completions"] += 1

        return {
            "total_sessions": total_sessions,
            "total_practice_minutes": total_practice_minutes,
            "avg_risk_score_last_5": avg_risk,
            "last_session_risk_score": session_data[0].get("final_risk_score", 0) if session_data else 0,
            "pose_stats": pose_stats,
        }
