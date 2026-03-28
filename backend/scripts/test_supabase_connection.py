import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from supabase import create_client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")

print(f"SUPABASE_URL: {url}")
print(f"SUPABASE_SERVICE_KEY: {key[:20]}..." if key else "SUPABASE_SERVICE_KEY: NOT SET")

if not url or not key:
    print("❌ Missing env vars")
    sys.exit(1)

try:
    client = create_client(url, key)
    print("✅ Supabase client created successfully")
except Exception as e:
    print(f"❌ Client creation failed: {e}")
    sys.exit(1)

# Test if tables exist
tables = ["users", "user_risk_profiles", "session_logs", "pose_attempt_logs", "risk_event_logs", "pain_check_logs"]
for table in tables:
    try:
        result = client.table(table).select("*").limit(1).execute()
        print(f"  ✅ {table} — exists ({len(result.data)} rows)")
    except Exception as e:
        error_msg = str(e)
        if "does not exist" in error_msg or "42P01" in error_msg:
            print(f"  ❌ {table} — TABLE NOT FOUND")
        else:
            print(f"  ⚠️ {table} — {error_msg[:120]}")
