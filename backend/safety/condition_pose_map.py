"""Condition → pose-level rule mapping.

This is the authoritative safety lookup table.  It takes precedence over
the ``avoid_conditions`` field in ``pose_library.json``.

Used by ``SafetyProfiler`` and ``SessionOrchestrator``.
"""
from __future__ import annotations

CONDITION_RULES: dict[str, dict] = {
    "high_bp": {
        "block_categories": ["back bend"],
        "block_keywords_in_avoid": ["high bp", "heart condition", "vertigo"],
        "block_prone": False,
        "block_inversions": True,
        "max_hold_reduction_pct": 0.5,
        "mandatory_modification": "Keep head above heart level at all times",
    },
    "heart_condition": {
        "block_categories": ["back bend", "balance"],
        "block_keywords_in_avoid": ["heart condition", "high bp"],
        "block_inversions": True,
        "max_hold_reduction_pct": 0.6,
        "mandatory_modification": "Rest between every pose — never rush transitions",
    },
    "low_bp": {
        "block_keywords_in_avoid": ["low bp", "vertigo"],
        "block_inversions": True,
        "transition_rule": "Rise slowly from any floor pose — hold 5 seconds before standing",
    },
    "back_slip_disc": {
        "block_categories": ["back bend"],
        "block_keywords_in_avoid": ["back injury"],
        "block_strong_forward_folds": True,
        "mandatory_modification": "Micro-bend knees in all forward folds; never force depth",
    },
    "knee_pain": {
        "block_keywords_in_avoid": ["knee injury", "knee pain"],
        "mandatory_modification": "Place cushion under knee in all kneeling poses; reduce bend depth",
    },
    "hip_injury": {
        "block_keywords_in_avoid": ["hip injury"],
        "mandatory_modification": "Sit on a folded blanket; reduce range in all hip openers",
    },
    "sciatica": {
        "block_keywords_in_avoid": ["sciatica", "back injury"],
        "mandatory_modification": "Never fold deeper than 90 degrees at hip; use blocks for support",
    },
    "vertigo": {
        "block_categories": ["balance"],
        "block_keywords_in_avoid": ["vertigo"],
        "block_inversions": True,
        "mandatory_modification": "Keep gaze fixed on one point; use wall for all balance poses",
    },
    "ankle_injury": {
        "block_keywords_in_avoid": ["ankle injury"],
        "mandatory_modification": "Avoid weight-bearing on injured ankle; use chair support",
    },
    "respiratory": {
        "mandatory_modification": "Never hold breath; keep all holds short; reduce pace by 30%",
        "max_hold_reduction_pct": 0.4,
    },
    "pregnancy": {
        "block_prone": True,
        "block_strong_backbends": True,
        "block_supine_after_trimester_1": True,
        "block_keywords_in_avoid": ["pregnant women"],
        "mandatory_modification": "Side-lying savasana; use a bolster; avoid core compression",
    },
    "recent_injury_surgery": {
        "risk_tier_override": "high",
        "mandatory_modification": "Practice only restorative poses; do not push range of motion",
        "block_categories": ["balance", "standing", "back bend", "prone"],
    },
}

# ── Inversion pose IDs (head-below-heart) ───────────────────────────────────
INVERSION_POSE_IDS: set[str] = {
    "down_dog", "padahastasana", "uttanasana", "prasarita_padottanasana",
    "ardha_uttanasana",
}

# ── Prone (face-down) pose IDs ─────────────────────────────────────────────
PRONE_POSE_IDS: set[str] = {
    "bhujangasana", "sphinx_pose", "salabhasana", "makarasana",
}

# ── Strong backbend pose IDs ───────────────────────────────────────────────
STRONG_BACKBEND_POSE_IDS: set[str] = {
    "bhujangasana", "hasta_uttanasana",
}

# ── Restorative pose IDs ───────────────────────────────────────────────────
RESTORATIVE_POSE_IDS: set[str] = {
    "savasana", "sukhasana", "vajrasana", "makarasana",
    "apanasana", "supta_baddha_konasana", "ananda_balasana",
    "balasana", "dandasana",
}
