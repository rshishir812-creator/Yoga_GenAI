from __future__ import annotations

from typing import Any

from app.ai.groq_client import GroqClient


MADHU_SYSTEM_PROMPT = """
You are Madhu, a calm and knowledgeable wellness assistant embedded in a yoga and breathwork app.

You help users with:
- Yoga pose guidance: form corrections, beginner modifications, pose sequencing, contraindications
- Breathwork protocols: technique explanations, when to use which protocol, physiological effects (HR, HRV, temperature)
- Session support: motivating users, answering mid-session questions, suggesting what to try next
- General wellness: sleep, stress, recovery, nervous system regulation — only where it intersects with yoga/breathwork

Tone: warm, grounding, expert but never clinical. Speak like a seasoned yoga teacher, not a chatbot.

Strict boundaries — you must refuse and redirect if the user asks about:
- Medical diagnosis, treatment, or medication
- Nutrition, diet plans, or supplements
- Mental health therapy or crisis support
- Anything unrelated to yoga, breathwork, or movement wellness

When refusing: be warm, acknowledge the question, explain you are focused on yoga and breathwork, and offer to help with something relevant instead.

Keep responses concise — 2 to 4 sentences unless the user explicitly asks for detail.
Never use bullet points unless the user asks for a list.
Never break character or reveal you are powered by an LLM.
If anyone asks your name, you are Madhu.
"""


class AssistantService:
    """Service for handling conversational requests using the Groq-powered Madhu assistant."""

    def __init__(self) -> None:
        self._llm = GroqClient()

    def generate_response(
        self,
        user_message: str,
        conversation_history: list[dict[str, str]] | None = None,
    ) -> str:
        """
        Generate a response from Madhu given a user message and optional conversation history.

        Args:
            user_message: The latest user message to respond to.
            conversation_history: List of prior messages (list of {role: 'user'|'assistant', content: str}).
                                  If provided, cap at last 10 messages to manage token usage.

        Returns:
            The assistant's response text.

        Raises:
            RuntimeError: If Groq API key is not set or if the API call fails.
        """
        # Build the messages array: history + new user message
        messages: list[dict[str, str]] = []

        if conversation_history:
            # Cap at last 10 messages to avoid token overflow
            messages.extend(conversation_history[-10:])

        # Append the latest user message
        messages.append({"role": "user", "content": user_message})

        try:
            # Call Groq with the same pattern as the pose evaluator
            self._llm._ensure_client()
            resp = self._llm._client.chat.completions.create(
                model="llama-3.3-70b-versatile",  # Use the same model as configured
                temperature=0.7,  # Slightly higher for conversational warmth
                system=MADHU_SYSTEM_PROMPT,
                messages=messages,
            )

            # Extract the response text
            reply_text = ""
            if resp and resp.choices:
                reply_text = (resp.choices[0].message.content or "").strip()

            return reply_text or "I'm having a moment of stillness — please try again shortly."

        except Exception as e:
            # Log error and return graceful fallback
            error_msg = str(e).lower()
            if "rate_limit" in error_msg or "429" in error_msg or "quota" in error_msg:
                return "I'm having a moment of stillness — please try again shortly."
            elif "groq_api_key" in error_msg:
                raise RuntimeError("GROQ_API_KEY is not set")
            else:
                # Log the error for debugging, then return fallback
                print(f"Assistant error: {e}")
                return "I'm having a moment of stillness — please try again shortly."
