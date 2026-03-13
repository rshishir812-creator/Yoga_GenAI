from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PoseTemplate:
    name: str
    # Ideal ranges for angles/metrics (human-friendly strings used by Gemini)
    ideal_ranges: dict[str, str]


POSE_TEMPLATES: dict[str, PoseTemplate] = {
    "Tadasana": PoseTemplate(
        name="Tadasana",
        ideal_ranges={
            "front_knee": "170-180",
            "back_knee": "170-180",
            "left_arm": "160-180",
            "right_arm": "160-180",
            "torso_tilt": "0-6",
            "arm_level_difference": "0-0.03",
            "hip_level_difference": "0-0.03",
            "center_offset": "0-0.05",
        },
    ),
    "Pranamasana": PoseTemplate(
        name="Pranamasana",
        ideal_ranges={
            # Prayer pose: similar to Tadasana (upright, stable)
            "front_knee": "170-180",
            "back_knee": "170-180",
            "left_arm": "150-180",
            "right_arm": "150-180",
            "torso_tilt": "0-8",
            "arm_level_difference": "0-0.04",
            "hip_level_difference": "0-0.04",
            "center_offset": "0-0.06",
        },
    ),
    "Hasta Uttanasana": PoseTemplate(
        name="Hasta Uttanasana",
        ideal_ranges={
            # Raised arms pose / slight backbend: mostly upright
            "front_knee": "170-180",
            "back_knee": "170-180",
            "left_arm": "160-180",
            "right_arm": "160-180",
            "torso_tilt": "0-20",
            "arm_level_difference": "0-0.05",
            "hip_level_difference": "0-0.05",
            "center_offset": "0-0.08",
        },
    ),
    "Padahastasana": PoseTemplate(
        name="Padahastasana",
        ideal_ranges={
            # Forward fold: torso may tilt more; keep symmetry + stability important
            "front_knee": "160-180",
            "back_knee": "160-180",
            "left_arm": "140-180",
            "right_arm": "140-180",
            "torso_tilt": "10-60",
            "arm_level_difference": "0-0.06",
            "hip_level_difference": "0-0.06",
            "center_offset": "0-0.10",
        },
    ),
    "Ashwa Sanchalanasana": PoseTemplate(
        name="Ashwa Sanchalanasana",
        ideal_ranges={
            # Low lunge: front knee bent, back leg more extended
            "front_knee": "80-125",
            "back_knee": "155-180",
            "left_arm": "140-180",
            "right_arm": "140-180",
            "torso_tilt": "0-25",
            "arm_level_difference": "0-0.06",
            "hip_level_difference": "0-0.06",
            "center_offset": "0-0.12",
        },
    ),
    "Warrior II": PoseTemplate(
        name="Warrior II",
        ideal_ranges={
            "front_knee": "85-115",
            "back_knee": "165-180",
            "left_arm": "165-180",
            "right_arm": "165-180",
            "torso_tilt": "0-10",
            "arm_level_difference": "0-0.05",
            "hip_level_difference": "0-0.05",
            "center_offset": "0-0.08",
        },
    ),
    "Tree Pose": PoseTemplate(
        name="Tree Pose",
        ideal_ranges={
            # standing knee (front_knee) should be mostly straight
            "front_knee": "165-180",
            # lifted knee (back_knee) tends to be noticeably bent/outward
            "back_knee": "40-110",
            "left_arm": "120-180",
            "right_arm": "120-180",
            "torso_tilt": "0-12",
            "arm_level_difference": "0-0.06",
            "hip_level_difference": "0-0.06",
            "center_offset": "0-0.10",
        },
    ),
    "Down Dog": PoseTemplate(
        name="Down Dog",
        ideal_ranges={
            "front_knee": "165-180",
            "back_knee": "165-180",
            "left_arm": "155-180",
            "right_arm": "155-180",
            # Front-view POC: keep this permissive
            "torso_tilt": "0-60",
            "arm_level_difference": "0-0.06",
            "hip_level_difference": "0-0.06",
            "center_offset": "0-0.10",
        },
    ),
    "Goddess": PoseTemplate(
        name="Goddess",
        ideal_ranges={
            "front_knee": "75-125",
            "back_knee": "75-125",
            "left_arm": "120-180",
            "right_arm": "120-180",
            "torso_tilt": "0-20",
            "arm_level_difference": "0-0.08",
            "hip_level_difference": "0-0.08",
            "center_offset": "0-0.12",
        },
    ),
    "Plank": PoseTemplate(
        name="Plank",
        ideal_ranges={
            "front_knee": "170-180",
            "back_knee": "170-180",
            "left_arm": "155-180",
            "right_arm": "155-180",
            "torso_tilt": "0-20",
            "arm_level_difference": "0-0.06",
            "hip_level_difference": "0-0.06",
            "center_offset": "0-0.10",
        },
    ),
}
