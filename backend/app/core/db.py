"""Supabase client singleton for the backend.

Initialised lazily on first call — works in both local dev and Vercel serverless.
"""
from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Return a cached Supabase client. Raises if env vars are missing."""
    url = settings.supabase_url
    key = settings.supabase_service_key
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set. "
            "Get them from your Supabase project → Settings → API."
        )
    return create_client(url, key)
