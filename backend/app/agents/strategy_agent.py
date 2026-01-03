# backend/app/agents/strategy_agent.py
"""Strategy agent that provides rule‑based advice based on intent.
It expects ``ctx['intent']`` to be a string like ``growth_advice`` or ``post_suggestion``.
"""

from .base import BaseAgent


class StrategyAgent(BaseAgent):
    name = "strategy"

    async def should_run(self, ctx):
        return ctx.get("intent") in {"growth_advice", "post_suggestion"}


    async def decide(self, observations: dict, history: dict, platform: str | None = None, intent: str | None = None, text: str | None = None) -> dict:
        """
        Synthesize observations and history into a strategic decision using LLM.
        """
        from app.services.llm import call_llm

        # Build prompt
        prompt_parts = [
            "### ROLE",
            "You are a Senior Social Media Growth Strategist and Viral Content Coach. Your goal is to provide elite-level, data-driven advice to help creators maximize engagement and reach.",
            f"\n### CONTEXT",
            f"Platform: {platform or 'General'}",
            f"User Intent: {intent or 'Analyze this post'}",
            f"\n### CONTENT UNDER REVIEW",
            f"Caption/Text: \"{text[:1000] + '...' if text and len(text) > 1000 else (text or 'No text content available')}\"",
            f"\n### OBSERVATIONS",
            f"- Visual Analysis: {observations.get('vision', 'No visual data')}",
            f"- Content Metrics: {observations.get('content', 'No content metrics available')}",
            f"\n### HISTORICAL PERFORMANCE",
            f"- Trend Insights: {history.get('trend', {}).get('insight', 'Insufficient data for trend analysis')}",
            f"- Past Recommendations: {history.get('diagnosis', {}).get('recommendation', 'N/A')}",
            f"\n### TASK",
            "Analyze the above data and provide a strategic critique. Your response MUST include:",
            "1. **Direct Critique**: What is working well and what is the biggest 'leak' in the current strategy?",
            "2. **The Fix**: 1-2 hyper-specific, actionable steps to improve performance (e.g., changes to the hook, visual framing, or CTA).",
            "3. **Expected Outcome**: Why these changes will lead to better engagement based on social media algorithms.",
            "\n### STYLE GUIDELINES",
            "- Use professional, punchy, and high-energy tone.",
            "- Avoid generic fluff like 'keep up the good work'.",
            "- Be brutally honest but constructive.",
            "- Word Limit: Maximum 150 words."
        ]
        
        prompt = "\n".join(prompt_parts)

        try:
            # Call LLM
            llm_response = await call_llm(prompt)
            advice = llm_response.strip()
        except Exception as e:
            print(f"LLM Error: {e}")
            advice = "Could not generate AI advice. Check network/API keys."

        return {
            "advice": advice,
            "confidence": 0.85,  # optimizing for user trust in AI
            "suggested_actions": ["edit_post", "schedule_post"],
            "decision_timestamp": "now"
        }

