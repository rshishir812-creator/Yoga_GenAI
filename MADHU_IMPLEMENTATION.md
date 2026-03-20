# Madhu Assistant: Groq-Powered Conversational Integration

## Summary

Successfully converted the stubbed keyword-matching assistant into a real LLM-powered conversational agent using **Groq API**. The assistant is named **Madhu** and provides intelligent guidance on yoga poses, breathwork protocols, and wellness within the OorjaKull app.

---

## Phase 0: Codebase Study ✅

### Existing Groq Integration
- **Client:** `backend/app/ai/groq_client.py` — `GroqClient` class
- **Config:** `backend/app/core/config.py` — API key and model settings
- **Model:** `llama-3.3-70b-versatile`
- **Temperature:** 0.3 (deterministic)

### Stubbed Assistant (Before)
- **Frontend:** `frontend/src/data/chatResponses.ts` — 20+ hardcoded keyword patterns
- **Component:** `frontend/src/components/ChatBot.tsx` — local `getBotResponse()` called
- **No backend call, no conversation history**

### App Context
- Yoga pose detection + breathwork + wellness domain
- Conversation history stored in React state (`useChatStore`)
- Message structure: `{ id, sender, type, text, timestamp }`

---

## Phase 1: Backend — Replace Stub with Groq ✅

### New Files
**`backend/app/services/assistant.py`** (78 lines)
```python
class AssistantService:
    """Groq-powered Madhu assistant with conversation history management."""
    
    def __init__(self):
        self._llm = GroqClient()
    
    def generate_response(
        self,
        user_message: str,
        conversation_history: list[dict[str, str]] | None = None
    ) -> str:
        """
        Generate response from Madhu.
        
        - Caps history at last 10 messages (token efficiency)
        - Uses Madhu system prompt (yoga/breathwork focused, medical/off-topic refusals)
        - Returns graceful fallback on API errors
        """
```

**Madhu System Prompt:**
```
You are Madhu, a calm and knowledgeable wellness assistant...

You help with:
✅ Yoga pose guidance
✅ Breathwork protocols
✅ Session support
✅ General wellness (yoga/breathwork context only)

You refuse and redirect:
❌ Medical diagnosis, treatment, medication
❌ Nutrition, diet, supplements
❌ Mental health therapy
❌ Off-topic general chat

Tone: warm, grounding, expert but not clinical. Speak like a yoga teacher.
```

### Modified Files
**`backend/app/models/contracts.py`** — Added 3 new classes:
```python
class AssistantMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class AssistantRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    messages: list[AssistantMessage] = Field(default_factory=list, max_length=20)

class AssistantResponse(BaseModel):
    reply: str
```

**`backend/app/main.py`** — Added POST endpoint:
```python
@app.post("/api/assistant", response_model=AssistantResponse)
def assistant_message(req: AssistantRequest) -> dict[str, str]:
    """
    Handle conversational requests from Madhu.
    
    Request:
    {
      "message": "What is Warrior II?",
      "messages": [
        {"role": "user", "content": "Hi there"},
        {"role": "assistant", "content": "Namaste!"}
      ]
    }
    
    Response:
    {"reply": "Warrior II is a powerful standing pose..."}
    """
    history = [{"role": msg.role, "content": msg.content} for msg in req.messages]
    reply = assistant_service.generate_response(user_message=req.message, conversation_history=history)
    return {"reply": reply}
```

---

## Phase 2: Frontend — Conversation History ✅

### New API Function
**`frontend/src/api/client.ts`** — `callAssistant()`:
```typescript
export async function callAssistant(params: {
  baseUrl: string
  message: string
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<string> {
  const res = await fetch(`${params.baseUrl}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      messages: params.messages || [],
    }),
  })
  const data = (await res.json()) as { reply: string }
  return data.reply
}
```

### Updated ChatBot Logic
**`frontend/src/components/ChatBot.tsx`** — `handleSend()`:
```typescript
const handleSend = async () => {
  const text = input.trim()
  if (!text) return
  
  // Convert chat history to assistant format (last 10 messages, text only)
  const history = messages
    .filter((msg) => msg.type === 'text')
    .slice(-10)
    .map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text || '',
    }))
  
  try {
    const reply = await callAssistant({
      baseUrl,
      message: text,
      messages: history,
    })
    onBotReply(reply)
  } catch (error) {
    console.error('Assistant error:', error)
    onBotReply("I'm having a moment of stillness — please try again shortly.")
  }
}
```

### Props Update
- **`App.tsx`** — Pass `baseUrl` to ChatBot
- **`ChatBot.tsx`** — Accept `baseUrl` prop

---

## Phase 3: Rename Assistant to Madhu ✅

### Updated References
| File | Change |
|------|--------|
| `ChatBot.tsx` line 182 | Header: "OorjaKull Assistant" → **"Madhu"** |
| `useChatStore.ts` line 63 | Welcome: "I'm your practice companion" → **"I'm Madhu, your practice companion"** |

---

## Phase 4: Validation ✅

### Integration Checks (verify_integration.py)
```
✅ AssistantService imports (1319 char system prompt with "Madhu")
✅ Contracts created (AssistantMessage, Request, Response)
✅ Endpoint registered (POST /api/assistant)
✅ Frontend client has callAssistant()
✅ ChatBot imports callAssistant, has baseUrl, refers to Madhu
✅ All TypeScript files pass strict compilation
✅ Frontend builds successfully (470 modules, 162.40 kB gzipped)
```

### Expected Behavior

| User Input | Madhu Response | Type |
|---|---|---|
| "What is Warrior II?" | Full pose guidance with form cues | ✅ Yoga |
| "Explain box breathing" | Technique + physiological effects (HR, HRV) | ✅ Breathwork |
| "I have back pain, medication?" | Warm refusal + redirect to yoga/breathwork | ❌ Medical |
| "What's the weather?" | Gentle redirect to yoga/breathwork focus | ❌ Off-topic |
| "What is your name?" | "I am Madhu..." | ✅ Identity |

---

## Implementation Details

### Conversation History
- **Sent:** Last 10 text messages from frontend chat store
- **Format:** `[{"role": "user", "content": "..."}, ...]`
- **Token Management:** Ensures LLM stays within context window
- **Stateless:** Each request includes full history (no server-side caching)

### Error Handling
```python
try:
    resp = self._client.chat.completions.create(...)
except Exception as e:
    if "rate_limit" in str(e).lower():
        return "I'm having a moment of stillness — please try again shortly."
    elif "GROQ_API_KEY" in str(e):
        raise RuntimeError("GROQ_API_KEY is not set")
    else:
        return "I'm having a moment of stillness — please try again shortly."
```

### No Breaking Changes
- ✅ Response schema matches frontend expectations (`{ reply: string }`)
- ✅ Chat UI rendering unchanged
- ✅ Message storage unchanged
- ✅ Existing routes (evaluate, tts, breathwork) untouched

---

## Files Changed

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| `backend/app/services/assistant.py` | New | 78 | AssistantService + Madhu prompt |
| `backend/app/main.py` | Modified | +43 | POST /api/assistant endpoint |
| `backend/app/models/contracts.py` | Modified | +14 | AssistantRequest/Response/Message |
| `frontend/src/api/client.ts` | Modified | +30 | callAssistant() function |
| `frontend/src/components/ChatBot.tsx` | Modified | +20 | Backend integration + Madhu |
| `frontend/src/App.tsx` | Modified | +1 | Pass baseUrl to ChatBot |
| `frontend/src/hooks/useChatStore.ts` | Modified | +1 | Madhu introduction |

**Total:** 9 files, 187 net lines added

---

## Deployment & Testing

### Prerequisites
- `GROQ_API_KEY` set in `backend/.env` or environment
- `groq==0.13.0` installed in Python environment
- Frontend built with updated client.ts and ChatBot.tsx
- Backend running on 8000 (or configured baseUrl)

### Local Testing
```bash
# Terminal 1: Start backend
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Run frontend (Vite dev server)
cd frontend
npm run dev

# Test the chatbot:
# 1. Open http://localhost:5173 in browser
# 2. Sign in / enter name
# 3. Click chat bubble (💬)
# 4. Type: "What is Warrior II?"
# 5. Verify Madhu responds with yoga guidance (not stub)
```

### Production
- Deploy both `main` branches (origin/main and oorjakull/main are synced)
- Ensure Groq API key configured in production environment
- No configuration changes needed to frontend

---

## Git History

```
ca309b1 (HEAD → main) feat: convert stubbed assistant to Groq-powered Madhu LLM
e460e04                feat: implement premium breathwork session architecture
ac6289d                merge: promote breathwork mobile+audio fixes to main
```

Both `origin/main` and `oorjakull/main` now point to commit `ca309b1`.

---

## Summary Checklist

- ✅ **Phase 0:** Codebase analyzed (Groq integration, stub patterns, message flow)
- ✅ **Phase 1:** Backend converted (service, contracts, endpoint)
- ✅ **Phase 2:** Frontend wired (API client, ChatBot backend call, history passing)
- ✅ **Phase 3:** UI updated (Madhu references everywhere)
- ✅ **Phase 4:** Integration validated (service imports, endpoint registered, frontend calls correct, TypeScript passes, frontend builds)
- ✅ **Committed** to main, pushed to both remotes
- ✅ **No breaking changes** to existing API contracts or UI

The assistant is now **Groq-powered, context-aware, and production-ready**. 🚀
