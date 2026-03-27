"""Session Orchestrator — creates safety-filtered session plans.

Given a user's risk profile and the requested sequence/flow, produces a
SessionPlan with blocked poses removed, modifications injected, hold times
adjusted, and substitute poses inserted where helpful.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from safety.models import (
    PosePlanItem,
    SessionPlan,
    UserRiskProfile,
)
from safety.condition_pose_map import RESTORATIVE_POSE_IDS


class SessionOrchestrator:
    """Builds per-session plans filtered through the safety layer."""

    def build_plan(
        self,
        profile: UserRiskProfile,
        flow_id: str,
        requested_pose_ids: list[str],
        library_lookup: dict[str, dict],
        *,
        last_session_risk_score: int = 0,
    ) -> SessionPlan:
        """Create a SessionPlan.

        Parameters
        ----------
        profile : UserRiskProfile
            The user's current safety profile.
        flow_id : str
            Identifier for the sequence (e.g. "morning_flow", "warrior_series").
        requested_pose_ids : list[str]
            Ordered pose IDs the flow contains.
        library_lookup : dict[str, dict]
            Maps pose_id → full pose data dict from the library.
        last_session_risk_score : int
            Final risk score from the user's most recent session.
            If > 70, hold times are reduced by an additional 20%.
        """
        session_id = str(uuid.uuid4())
        poses: list[PosePlanItem] = []
        warnings: list[str] = []

        # Carry-over risk: reduce holds if last session ended badly
        carry_over_factor = 0.8 if last_session_risk_score > 70 else 1.0
        total_hold = profile.max_hold_factor * carry_over_factor

        # do_not_practice → breathing-only session
        if profile.risk_tier == "do_not_practice":
            warnings.append(
                "Based on your reported symptoms, we recommend a breathing-only session today. "
                "Please consult your doctor before returning to physical poses."
            )
            # Offer savasana + breathwork only
            for pid in ["savasana", "sukhasana"]:
                pdata = library_lookup.get(pid)
                if pdata:
                    poses.append(PosePlanItem(
                        pose_id=pid,
                        name_en=pdata.get("name_en", pid),
                        hold_seconds=int(pdata.get("hold_seconds", 30) * total_hold),
                    ))
            return SessionPlan(
                session_id=session_id,
                flow_id=flow_id,
                user_id=profile.user_id,
                risk_tier=profile.risk_tier,
                risk_profile_version=profile.profile_version,
                poses=poses,
                warnings=warnings,
                estimated_duration_minutes=max(1, sum(p.hold_seconds for p in poses) // 60),
                created_at=datetime.now(timezone.utc),
            )

        blocked_set = set(profile.blocked_pose_ids)
        modified_map = profile.modified_pose_ids

        for pid in requested_pose_ids:
            pdata = library_lookup.get(pid)
            if not pdata:
                continue

            if pid in blocked_set:
                # Try to substitute with a restorative pose
                sub = self._find_substitute(pid, library_lookup, blocked_set)
                if sub:
                    sub_data = library_lookup[sub]
                    poses.append(PosePlanItem(
                        pose_id=sub,
                        name_en=sub_data.get("name_en", sub),
                        hold_seconds=int(sub_data.get("hold_seconds", 15) * total_hold),
                        is_substituted=True,
                        original_pose_id=pid,
                        advisory=f"Substituted for {pdata.get('name_en', pid)} (not recommended for your profile).",
                    ))
                else:
                    warnings.append(
                        f"{pdata.get('name_en', pid)} has been removed from your session for safety."
                    )
                continue

            modification = modified_map.get(pid)
            advisory = None
            if pid in profile.advisory_pose_ids:
                advisory = "Proceed with extra caution for this pose."

            hold_raw = pdata.get("hold_seconds", 15)
            hold_adjusted = max(5, int(hold_raw * total_hold))

            poses.append(PosePlanItem(
                pose_id=pid,
                name_en=pdata.get("name_en", pid),
                hold_seconds=hold_adjusted,
                modification=modification,
                advisory=advisory,
            ))

        if carry_over_factor < 1.0:
            warnings.append(
                "Your previous session had elevated risk signals. "
                "Hold times have been reduced by 20% as a precaution."
            )

        if profile.risk_tier == "high":
            warnings.append(
                "Your profile indicates elevated risk. "
                "Please listen to your body and stop immediately if you feel pain."
            )

        return SessionPlan(
            session_id=session_id,
            flow_id=flow_id,
            user_id=profile.user_id,
            risk_tier=profile.risk_tier,
            risk_profile_version=profile.profile_version,
            poses=poses,
            warnings=warnings,
            estimated_duration_minutes=max(1, sum(p.hold_seconds for p in poses) // 60),
            created_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _find_substitute(
        blocked_pid: str,
        library: dict[str, dict],
        blocked_set: set[str],
    ) -> str | None:
        """Try to find a safe restorative substitute for a blocked pose."""
        for restorative in RESTORATIVE_POSE_IDS:
            if restorative not in blocked_set and restorative in library:
                return restorative
        return None
