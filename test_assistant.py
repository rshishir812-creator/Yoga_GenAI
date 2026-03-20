#!/usr/bin/env python3
"""Test the /api/assistant endpoint with various queries."""

import sys
import time
import subprocess
from pathlib import Path

# Start uvicorn in background
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

# Wait for server to start
print("Waiting for server to start...")
time.sleep(3)

import requests

BASE_URL = "http://localhost:8000"

def test_assistant(message: str, messages=None, test_name=""):
    """Test the assistant endpoint."""
    if messages is None:
        messages = []
    
    payload = {
        "message": message,
        "messages": messages,
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/api/assistant", json=payload, timeout=10)
        if resp.status_code == 200:
            reply = resp.json()["reply"]
            print(f"\n✅ {test_name}")
            print(f"   Q: {message}")
            print(f"   A: {reply[:120]}..." if len(reply) > 120 else f"   A: {reply}")
            return True
        else:
            print(f"\n❌ {test_name}")
            print(f"   Status: {resp.status_code}, Response: {resp.text}")
            return False
    except Exception as e:
        print(f"\n❌ {test_name}")
        print(f"   Error: {e}")
        return False

# Test cases
print("=" * 70)
print("Testing Madhu Assistant Endpoint")
print("=" * 70)

test_assistant(
    "What is Warrior II and how do I practice it?",
    test_name="Test 1: Yoga pose question"
)

test_assistant(
    "Explain box breathing and its effects on heart rate.",
    test_name="Test 2: Breathwork question"
)

test_assistant(
    "I have severe back pain, what medication should I take?",
    test_name="Test 3: Medical question (should be refused)"
)

test_assistant(
    "Tell me about the weather today.",
    test_name="Test 4: Off-topic question (should be redirected)"
)

test_assistant(
    "What is your name?",
    test_name="Test 5: Name query (should respond with Madhu)"
)

# Test with conversation history
history = [
    {"role": "user", "content": "Hi, what's your name?"},
    {"role": "assistant", "content": "I'm Madhu, your yoga and breathwork companion!"},
]

test_assistant(
    "What can you help me with?",
    messages=history,
    test_name="Test 6: Conversation with history"
)

print("\n" + "=" * 70)
print("All tests completed!")
print("=" * 70)
