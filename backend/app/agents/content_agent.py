# backend/app/agents/content_agent.py
"""Content agent that extracts simple features from a list of posts.
It expects ``ctx['posts']`` to be a list of dicts with keys like ``text`` or ``content``.
"""

from .base import BaseAgent
from ..services.content_service import extract_content_features  # you may need to implement this helper


class ContentAgent(BaseAgent):
    name = "content"

    async def should_run(self, ctx):
        return bool(ctx.get("posts"))

    async def analyze(self, ctx):
        """Analyze text content features."""
        text = ctx.get("text", "")
        if not text:
            return {"status": "no_text"}

        low_text = text.lower()
        
        # Simple heuristics for better signals
        has_cta = any(word in low_text for word in ["link", "bio", "comment", "follow", "subscribe", "buy", "check"])
        has_question = "?" in text
        has_hashtags = "#" in text
        is_formatted = "\n" in text # Check for line breaks
        
        return {
            "length": len(text),
            "hook_strength": "strong" if (len(text) > 40 and has_question) else "weak",
            "has_cta": has_cta,
            "has_question": has_question,
            "has_hashtags": has_hashtags,
            "is_formatted": is_formatted,
            "sentiment": "neutral" # placeholder
        }

    async def run(self, ctx):
        return await self.analyze(ctx)
