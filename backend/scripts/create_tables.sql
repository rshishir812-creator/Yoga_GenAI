-- ==========================================================================
-- Yoga Safety Architecture — Supabase SQL Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ==========================================================================

-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub      TEXT UNIQUE NOT NULL,
    email           TEXT,
    display_name    TEXT,
    picture_url     TEXT,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── User Risk Profiles ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_risk_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    risk_tier       VARCHAR(20) NOT NULL,
    profile_json    JSONB NOT NULL,
    consent_given   BOOLEAN NOT NULL DEFAULT FALSE,
    consent_at      TIMESTAMPTZ,
    profile_version INT DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_urp_user_id ON user_risk_profiles(user_id);

-- ── Session Logs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flow_id             VARCHAR(100),
    state               VARCHAR(20) NOT NULL DEFAULT 'idle',
    session_plan_json   JSONB,
    final_risk_score    INT DEFAULT 0,
    started_at          TIMESTAMPTZ,
    ended_at            TIMESTAMPTZ,
    duration_seconds    INT,
    session_summary_llm TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sl_user_id ON session_logs(user_id);

-- ── Pose Attempt Logs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pose_attempt_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
    pose_id         VARCHAR(100) NOT NULL,
    peak_score      INT,
    avg_score       INT,
    completed       BOOLEAN DEFAULT FALSE,
    hold_seconds    INT,
    violations_json JSONB,
    llm_feedback    TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pal_session_id ON pose_attempt_logs(session_id);

-- ── Risk Event Logs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_event_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
    pose_id         VARCHAR(100),
    event_type      VARCHAR(20) NOT NULL,
    risk_score_at   INT,
    signals_json    JSONB,
    reason          TEXT,
    triggered_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rel_session_id ON risk_event_logs(session_id);

-- ── Pain Check Logs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pain_check_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
    pose_id         VARCHAR(100),
    pain_level      VARCHAR(20),
    triggered_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pcl_session_id ON pain_check_logs(session_id);

-- ── Row-Level Security (optional — enable if using Supabase Auth) ──────────
-- For now, access is controlled via the service key on the backend.
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_risk_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pose_attempt_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE risk_event_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pain_check_logs ENABLE ROW LEVEL SECURITY;
