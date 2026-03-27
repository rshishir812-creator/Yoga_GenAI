"""Lightweight auth: verify Google OAuth ID token and upsert user row.

Design constraints
──────────────────
• The frontend already uses @react-oauth/google and sends the credential JWT.
• We verify it server-side with google-auth, then upsert into Supabase `users`.
• A simple Bearer token header carries the Google `sub` (user id) for subsequent
  requests.  For this POC we trust the sub directly after initial verification.
• No session cookies, no refresh tokens — keep it stateless for Vercel serverless.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, Header, HTTPException

from google.oauth2 import id_token as google_id_token  # type: ignore[import-untyped]
from google.auth.transport import requests as google_requests  # type: ignore[import-untyped]

from app.core.config import settings
from app.core.db import get_supabase

# Google client IDs that we accept (the one used in the frontend)
_GOOGLE_CLIENT_IDS: list[str] = [
    cid.strip()
    for cid in (settings.google_client_id or "").split(",")
    if cid.strip()
]


def verify_google_token(token: str) -> dict[str, Any]:
    """Verify a Google OAuth credential JWT and return the payload.

    Raises HTTPException(401) on any verification failure.
    """
    if not _GOOGLE_CLIENT_IDS:
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_CLIENT_ID not configured on the server.",
        )
    try:
        payload = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience=_GOOGLE_CLIENT_IDS[0],
        )
        return payload
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {exc}") from exc


def upsert_user(google_payload: dict[str, Any]) -> dict[str, Any]:
    """Create or update a user row in Supabase `users` table.

    Returns the user row dict.
    """
    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    sub = google_payload["sub"]
    email = google_payload.get("email", "")
    name = google_payload.get("name", "")
    picture = google_payload.get("picture", "")

    # Try upsert (Supabase uses PostgREST)
    row = {
        "google_sub": sub,
        "email": email,
        "display_name": name,
        "picture_url": picture,
        "last_login_at": now,
    }

    result = (
        sb.table("users")
        .upsert(row, on_conflict="google_sub")
        .execute()
    )
    if result.data:
        return result.data[0]
    # Fallback: fetch by google_sub
    result = sb.table("users").select("*").eq("google_sub", sub).single().execute()
    return result.data


def get_current_user(
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    """FastAPI dependency — extracts user_id from the Authorization header.

    Expected format: ``Bearer <google_sub>``

    For this POC the google_sub is trusted after initial /api/auth/google
    verification.  In production, swap for a signed JWT or Supabase Auth session.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization format")
    google_sub = parts[1].strip()
    if not google_sub:
        raise HTTPException(status_code=401, detail="Empty bearer token")
    # Fetch user from DB
    sb = get_supabase()
    result = sb.table("users").select("*").eq("google_sub", google_sub).single().execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="User not found — sign in first")
    return result.data


def get_optional_user(
    authorization: str | None = Header(default=None),
) -> dict[str, Any] | None:
    """Like get_current_user but returns None instead of raising for unauthenticated."""
    if not authorization:
        return None
    try:
        return get_current_user(authorization)
    except HTTPException:
        return None
