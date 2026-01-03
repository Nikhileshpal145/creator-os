# backend/app/agents/jarvis_agent.py
"""Jarvis LLM agent that synthesises results from other agents.
It now also persists the last user intent using the AgentMemory service.
Expected context keys:
    - vision (optional)
    - content (optional)
    - analytics (optional)
    - strategy (optional)
    - intent (string)
    - profile (optional)
    - user_id (string) – required for memory persistence
"""

from .base import BaseAgent
from ..services.llm import call_llm  # your existing async LLM wrapper
from ..services.agent_memory import save_memory, load_memory
from sqlmodel import Session
from ..db.session import engine


class JarvisAgent(BaseAgent):
    name = "jarvis"

    async def should_run(self, ctx):
        # Always run – it consumes whatever other agents produced.
        return True

    async def run(self, ctx):
        user_id = ctx.get("user_id")
        # Load previous intent if any (for continuity)
        if user_id:
            with Session(engine) as sess:
                prev_intent = load_memory(sess, user_id, "last_intent")
                if prev_intent:
                    ctx["prev_intent"] = prev_intent

        # Build a prompt that concatenates available pieces.
        sections = []
        if ctx.get("intent"):
            sections.append(f"User intent: {ctx['intent']}")
        if ctx.get("prev_intent"):
            sections.append(f"Previous intent: {ctx['prev_intent']}")
        if ctx.get("profile"):
            sections.append(f"User profile: {ctx['profile']}")
        if ctx.get("vision"):
            sections.append(f"Vision analysis: {ctx['vision']}")
        if ctx.get("content"):
            sections.append(f"Content features: {ctx['content']}")
        if ctx.get("analytics"):
            sections.append(f"Analytics results: {ctx['analytics']}")
        if ctx.get("strategy"):
            sections.append(f"Strategy suggestion: {ctx['strategy']}")

        prompt = "\n\n".join(sections) + "\n\nAnswer as Jarvis, concise, actionable, and cite any data used."
        # Call the LLM – assumed to be async and return a string.
        response = await call_llm(prompt)

        # Persist the current intent for the next turn.
        if user_id and ctx.get("intent"):
            with Session(engine) as sess:
                save_memory(sess, user_id, "last_intent", ctx["intent"])

        return response
