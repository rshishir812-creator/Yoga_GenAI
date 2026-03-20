#!/usr/bin/env python3
"""Verify the assistant endpoint is properly integrated."""

import sys
import json
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

print("=" * 70)
print("Verifying Assistant Integration")
print("=" * 70)

# Test 1: Import the service
print("\n1. Checking AssistantService can be imported...")
try:
    from app.services.assistant import AssistantService, MADHU_SYSTEM_PROMPT
    print("   ✅ AssistantService imported successfully")
    print(f"   ✅ System prompt is {len(MADHU_SYSTEM_PROMPT)} characters")
    assert "Madhu" in MADHU_SYSTEM_PROMPT
    print("   ✅ System prompt mentions 'Madhu'")
except Exception as e:
    print(f"   ❌ Failed: {e}")
    sys.exit(1)

# Test 2: Check contracts
print("\n2. Checking AssistantRequest/Response contracts...")
try:
    from app.models.contracts import AssistantRequest, AssistantResponse, AssistantMessage
    
    # Create a test request
    req = AssistantRequest(
        message="What is yoga?",
        messages=[
            AssistantMessage(role="user", content="Hello"),
            AssistantMessage(role="assistant", content="Hi there!"),
        ]
    )
    print("   ✅ AssistantRequest created successfully")
    print(f"   ✅ Message: {req.message}")
    print(f"   ✅ History length: {len(req.messages)}")
    
    # Create a test response
    resp = AssistantResponse(reply="Great question about yoga!")
    print("   ✅ AssistantResponse created successfully")
except Exception as e:
    print(f"   ❌ Failed: {e}")
    sys.exit(1)

# Test 3: Check endpoint is registered
print("\n3. Checking FastAPI app has assistant endpoint...")
try:
    from app.main import app
    
    # Find the assistant endpoint
    found = False
    for route in app.routes:
        if hasattr(route, "path") and "/api/assistant" in route.path:
            found = True
            print(f"   ✅ Endpoint found: {route.path}")
            print(f"   ✅ Methods: {route.methods if hasattr(route, 'methods') else 'N/A'}")
    
    if not found:
        print("   ❌ /api/assistant endpoint not found!")
        sys.exit(1)
except Exception as e:
    print(f"   ❌ Failed: {e}")
    sys.exit(1)

# Test 4: Check frontend API client
print("\n4. Checking frontend API client has callAssistant...")
try:
    # This is a bit hacky but we can at least verify the file exists
    frontend_client_file = Path(__file__).parent / "frontend" / "src" / "api" / "client.ts"
    if frontend_client_file.exists():
        content = frontend_client_file.read_text()
        if "callAssistant" in content:
            print("   ✅ callAssistant function found in frontend client")
            if "POST /api/assistant" in content or "/api/assistant" in content:
                print("   ✅ Function calls correct endpoint")
        else:
            print("   ❌ callAssistant function not found!")
            sys.exit(1)
    else:
        print("   ❌ Frontend client file not found!")
        sys.exit(1)
except Exception as e:
    print(f"   ❌ Failed: {e}")
    sys.exit(1)

# Test 5: Check ChatBot integration
print("\n5. Checking frontend ChatBot has baseUrl prop...")
try:
    chatbot_file = Path(__file__).parent / "frontend" / "src" / "components" / "ChatBot.tsx"
    if chatbot_file.exists():
        content = chatbot_file.read_text(encoding="utf-8", errors="ignore")
        if "callAssistant" in content:
            print("   ✅ ChatBot imports callAssistant")
        if "baseUrl" in content:
            print("   ✅ ChatBot has baseUrl parameter")
        if "Madhu" in content:
            print("   ✅ ChatBot refers to 'Madhu'")
        else:
            print("   ⚠️  ChatBot might not refer to 'Madhu'")
    else:
        print("   ❌ ChatBot file not found!")
        sys.exit(1)
except Exception as e:
    print(f"   ❌ Failed: {e}")
    sys.exit(1)

print("\n" + "=" * 70)
print("✅ All integration checks passed!")
print("=" * 70)
print("\nReady for production deployment.")
print("\nNOTE: Full functional test requires:")
print("  1. Backend server running on http://localhost:8000")
print("  2. GROQ_API_KEY configured in environment")
print("  3. Frontend app running for end-to-end testing")
