-- ==========================================================================
-- User Profiles & Credit System — Supabase SQL Migration #002
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ==========================================================================

-- ── Profile type enum ──────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE profile_type AS ENUM ('super_user', 'paid_user', 'free_user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── User Profiles table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    profile_type        profile_type NOT NULL DEFAULT 'free_user',
    credits_remaining   INT,              -- NULL = unlimited (super_user / paid_user)
    credits_used        INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_up_user_id ON user_profiles(user_id);

-- ── Auto-create a free_user profile when a new user signs up ───────────────
CREATE OR REPLACE FUNCTION create_default_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id, profile_type, credits_remaining, credits_used)
    VALUES (NEW.id, 'free_user', 20, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_default_profile ON users;
CREATE TRIGGER trg_create_default_profile
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_profile();

-- ── Atomic credit deduction RPC ────────────────────────────────────────────
-- Returns: { ok: boolean, credits_remaining: int | null }
-- NULL credits_remaining means unlimited (super/paid user).
-- Refuses to go below 0 for free users.
CREATE OR REPLACE FUNCTION deduct_credit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_credits INT;
    v_profile_type profile_type;
BEGIN
    SELECT up.credits_remaining, up.profile_type
      INTO v_credits, v_profile_type
      FROM user_profiles up
     WHERE up.user_id = p_user_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'credits_remaining', NULL, 'reason', 'no_profile');
    END IF;

    -- Unlimited users (NULL credits) — just increment usage counter
    IF v_credits IS NULL THEN
        UPDATE user_profiles
           SET credits_used = credits_used + 1,
               updated_at = NOW()
         WHERE user_id = p_user_id;
        RETURN jsonb_build_object('ok', true, 'credits_remaining', NULL);
    END IF;

    -- Free-tier user with 0 credits left
    IF v_credits <= 0 THEN
        RETURN jsonb_build_object('ok', false, 'credits_remaining', 0, 'reason', 'exhausted');
    END IF;

    -- Deduct one credit
    UPDATE user_profiles
       SET credits_remaining = credits_remaining - 1,
           credits_used = credits_used + 1,
           updated_at = NOW()
     WHERE user_id = p_user_id;

    RETURN jsonb_build_object('ok', true, 'credits_remaining', v_credits - 1);
END;
$$ LANGUAGE plpgsql;

-- ── Backfill: create profiles for existing users who don't have one ────────
INSERT INTO user_profiles (user_id, profile_type, credits_remaining, credits_used)
SELECT u.id, 'free_user', 20, 0
  FROM users u
 WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ── Seed: promote Shishir and Madhuparna to super_user ─────────────────────
-- (Match by email since google_sub is opaque. Adjust if needed.)
UPDATE user_profiles
   SET profile_type = 'super_user',
       credits_remaining = NULL,
       updated_at = NOW()
 WHERE user_id IN (
    SELECT id FROM users
     WHERE email ILIKE '%shishir%'
        OR email ILIKE '%madhuparna%'
);
