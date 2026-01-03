# backend/app/agents/orchestrator.py
"""Orchestrator that runs the core Creator OS agents.
It receives a context dict, runs Vision, Content, Analytics,
Strategy, stores the decision in memory, and returns the strategy decision.
"""

from .vision_agent import VisionAgent
from .content_agent import ContentAgent
from .analytics_agent import AnalyticsAgent
from .strategy_agent import StrategyAgent
from .memory import AgentMemory

class OrchestratorAgent:
    def __init__(self):
        self.vision = VisionAgent()
        self.content = ContentAgent()
        self.analytics = AnalyticsAgent()
        self.strategy = StrategyAgent()
        self.memory = AgentMemory()

    async def run(self, ctx: dict):
        observations = {}
        if ctx.get("image"):
            observations["vision"] = await self.vision.analyze(ctx)
        if ctx.get("text"):
            observations["content"] = await self.content.analyze(ctx)
        user_id = ctx.get("user_id")
        history = self.analytics.fetch_user_patterns(user_id) if user_id else {}
        decision = await self.strategy.decide(
            observations=observations,
            history=history,
            platform=ctx.get("platform"),
            intent=ctx.get("intent"),
            text=ctx.get("text"),
        )
        if user_id:
            self.memory.store(
                user_id=user_id,
                observation=observations,
                decision=decision,
            )
        return decision
