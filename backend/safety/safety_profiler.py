"""Safety Profiler — converts UserHealthInput → UserRiskProfile.

Pure function: no DB access, no LLM calls.  All logic is deterministic
and auditable.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone

from safety.models import UserHealthInput, UserRiskProfile
from safety.condition_pose_map import (
    CONDITION_RULES,
    INVERSION_POSE_IDS,
    PRONE_POSE_IDS,
    RESTORATIVE_POSE_IDS,
    STRONG_BACKBEND_POSE_IDS,
)


def _normalise(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    return re.sub(r"[^a-z0-9 ]", "", text.lower()).strip()


class SafetyProfiler:
    """Builds a ``UserRiskProfile`` from health questionnaire input."""

    # Condition groups
    CARDIOVASCULAR = {"high_bp", "heart_condition", "low_bp"}
    SPINAL = {"back_slip_disc", "sciatica"}
    LOWER_LIMB = {"knee_pain", "hip_injury", "ankle_injury"}
    BALANCE = {"vertigo"}
    RESPIRATORY = {"respiratory"}

    # Activity symptoms that trigger do_not_practice
    ABSOLUTE_CONTRAINDICATIONS = {
        "chest_pain",
        "shortness_of_breath",
        "dizziness_fainting",
    }

    def build_profile(
        self,
        health_input: UserHealthInput,
        pose_library: list[dict],
        *,
        user_id: str = "",
        existing_version: int = 0,
    ) -> UserRiskProfile:
        """Main entry point.  Call on every questionnaire submission."""
        conditions = set(health_input.medical_conditions) - {"none"}
        symptoms = set(health_input.activity_symptoms) - {"none"}
        restrictions = set(health_input.mobility_restrictions) - {"none"}

        risk_tier = self._compute_risk_tier(health_input, conditions, symptoms)

        # Condition flags
        has_cv = bool(conditions & self.CARDIOVASCULAR)
        has_sp = bool(conditions & self.SPINAL)
        has_ll = bool(conditions & self.LOWER_LIMB)
        has_bal = bool(conditions & self.BALANCE) or "balance_issues" in restrictions
        has_resp = bool(conditions & self.RESPIRATORY)

        blocked, modified, advisory = self._compute_pose_gates(
            health_input, conditions, symptoms, restrictions, pose_library, risk_tier,
        )

        max_hold = self._compute_max_hold_factor(conditions, risk_tier, health_input)

        return UserRiskProfile(
            user_id=user_id,
            risk_tier=risk_tier,
            has_cardiovascular_risk=has_cv,
            has_spinal_sensitivity=has_sp,
            has_lower_limb_sensitivity=has_ll,
            has_balance_disorder=has_bal,
            has_respiratory_condition=has_resp,
            is_pregnant=health_input.is_pregnant,
            has_recent_injury=health_input.recent_surgery_or_injury,
            current_pain_level=health_input.current_pain_level,
            current_pain_areas=[a for a in health_input.current_pain_areas if a != "none"],
            blocked_pose_ids=blocked,
            modified_pose_ids=modified,
            advisory_pose_ids=advisory,
            max_hold_factor=max_hold,
            consent_given=health_input.consent_given,
            consent_timestamp=datetime.now(timezone.utc),
            profile_version=existing_version + 1,
        )

    # ── Risk tier ───────────────────────────────────────────────────────────

    def _compute_risk_tier(
        self,
        hi: UserHealthInput,
        conditions: set[str],
        symptoms: set[str],
    ) -> str:
        # do_not_practice: any absolute contraindication symptom
        if symptoms & self.ABSOLUTE_CONTRAINDICATIONS:
            return "do_not_practice"

        # high: pregnancy, recent surgery, pain ≥ 7, heart + active symptoms
        if hi.is_pregnant or hi.recent_surgery_or_injury:
            return "high"
        if hi.current_pain_level >= 7:
            return "high"
        if "heart_condition" in conditions and (symptoms - {"none", "severe_fatigue"}):
            return "high"

        # moderate: any medical condition present
        if conditions:
            return "moderate"

        return "low"

    # ── Pose gates ──────────────────────────────────────────────────────────

    def _compute_pose_gates(
        self,
        hi: UserHealthInput,
        conditions: set[str],
        symptoms: set[str],
        restrictions: set[str],
        library: list[dict],
        risk_tier: str,
    ) -> tuple[list[str], dict[str, str], list[str]]:
        """Return (blocked_ids, modified_ids, advisory_ids)."""
        blocked: set[str] = set()
        modified: dict[str, str] = {}
        advisory: set[str] = set()

        # Gather all condition rules that apply
        active_rules: list[dict] = []
        for cond in conditions:
            rule = CONDITION_RULES.get(cond)
            if rule:
                active_rules.append(rule)
        if hi.is_pregnant:
            preg_rule = CONDITION_RULES.get("pregnancy")
            if preg_rule:
                active_rules.append(preg_rule)
        if hi.recent_surgery_or_injury:
            surg_rule = CONDITION_RULES.get("recent_injury_surgery")
            if surg_rule:
                active_rules.append(surg_rule)

        # Aggregate block criteria
        block_categories: set[str] = set()
        block_keywords: set[str] = set()
        block_inversions = False
        block_prone = False
        block_strong_backbends = False
        mods: list[str] = []

        for rule in active_rules:
            for cat in rule.get("block_categories", []):
                block_categories.add(_normalise(cat))
            for kw in rule.get("block_keywords_in_avoid", []):
                block_keywords.add(_normalise(kw))
            if rule.get("block_inversions"):
                block_inversions = True
            if rule.get("block_prone"):
                block_prone = True
            if rule.get("block_strong_backbends"):
                block_strong_backbends = True
            mod = rule.get("mandatory_modification")
            if mod:
                mods.append(mod)

        # Pain ≥ 8: block all non-restorative
        block_non_restorative = hi.current_pain_level >= 8

        # Apply to each pose
        for pose in library:
            pid = pose.get("pose_id", "")
            category = _normalise(pose.get("category", ""))
            avoid_raw = pose.get("avoid_conditions", [])
            avoid_norm = {_normalise(a) for a in avoid_raw}

            # Check hard blocks
            is_blocked = False

            # Block by category
            if category in block_categories:
                is_blocked = True

            # Block by avoid keywords
            if block_keywords & avoid_norm:
                is_blocked = True

            # Block inversions
            if block_inversions and pid in INVERSION_POSE_IDS:
                is_blocked = True

            # Block prone
            if block_prone and pid in PRONE_POSE_IDS:
                is_blocked = True

            # Block strong backbends
            if block_strong_backbends and pid in STRONG_BACKBEND_POSE_IDS:
                is_blocked = True

            # Block non-restorative if pain ≥ 8
            if block_non_restorative and pid not in RESTORATIVE_POSE_IDS:
                is_blocked = True

            if is_blocked:
                blocked.add(pid)
            else:
                # Check if modification applies
                pose_mods: list[str] = []
                for rule in active_rules:
                    rule_kws = {_normalise(k) for k in rule.get("block_keywords_in_avoid", [])}
                    if rule_kws & avoid_norm:
                        mod = rule.get("mandatory_modification")
                        if mod:
                            pose_mods.append(mod)
                if pose_mods:
                    modified[pid] = "; ".join(pose_mods)
                elif mods and not is_blocked:
                    # Global modification applies
                    advisory.add(pid)

        return sorted(blocked), modified, sorted(advisory - blocked)

    # ── Hold factor ─────────────────────────────────────────────────────────

    def _compute_max_hold_factor(
        self,
        conditions: set[str],
        risk_tier: str,
        hi: UserHealthInput,
    ) -> float:
        """Compute the most restrictive hold-time factor."""
        factor = 1.0

        # From condition rules
        for cond in conditions:
            rule = CONDITION_RULES.get(cond, {})
            pct = rule.get("max_hold_reduction_pct")
            if pct is not None:
                factor = min(factor, pct)

        # Tier-based overrides
        if risk_tier == "high":
            if hi.is_pregnant:
                factor = min(factor, 0.6)
            elif hi.recent_surgery_or_injury:
                factor = min(factor, 0.4)
            elif hi.current_pain_level >= 7:
                factor = min(factor, 0.5)

        return factor
