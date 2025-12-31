"""
Orchestrator Agent - The brain that coordinates all specialized agents.
Implements the core loop: OBSERVE → UNDERSTAND → REASON → ADVISE → REMEMBER
"""

from typing import Dict, Any, Optional
from .context import AgentContext
from .memory import agent_memory
from .vision_agent import vision_agent
from .content_agent import content_agent
from .analytics_agent import analytics_agent
from .strategy_agent import strategy_agent
import logging

logger = logging.getLogger(__name__)


class OrchestratorAgent:
    """
    Central coordinator that runs the agent pipeline.
    
    Flow:
    1. OBSERVE: Collect data from context (image, text)
    2. UNDERSTAND: Run specialized agents (vision, content)
    3. REASON: Strategy agent combines observations + history
    4. ADVISE: Produce actionable decision
    5. REMEMBER: Store in memory for learning
    """
    
    def __init__(self):
        self.vision = vision_agent
        self.content = content_agent
        self.analytics = analytics_agent
        self.strategy = strategy_agent
        self.memory = agent_memory
    
    async def run(self, ctx: AgentContext) -> Dict[str, Any]:
        """
        Run the full agent orchestration pipeline.
        
        Args:
            ctx: AgentContext with user_id, image, text, platform
            
        Returns:
            Decision dict with advice, score, confidence, and explanation
        """
        
        logger.info(f"Orchestrator running for user {ctx.user_id}")
        
        observations = {}
        
        # ===== OBSERVE =====
        
        # Vision analysis (if image provided)
        if ctx.has_image():
            try:
                observations["vision"] = await self.vision.analyze(ctx)
                logger.info(f"Vision analysis complete: {observations['vision'].get('risk', 'N/A')}")
            except Exception as e:
                logger.error(f"Vision agent failed: {e}")
                observations["vision"] = {"analyzed": False, "error": str(e)}
        
        # Content analysis (if text provided)
        if ctx.has_text():
            try:
                observations["content"] = await self.content.analyze(ctx)
                logger.info(f"Content analysis complete: score {observations['content'].get('score', 'N/A')}")
            except Exception as e:
                logger.error(f"Content agent failed: {e}")
                observations["content"] = {"analyzed": False, "error": str(e)}
        
        # ===== UNDERSTAND =====
        
        # Fetch user's historical patterns
        history = self.analytics.fetch_user_patterns(ctx.user_id)
        
        # ===== REASON =====
        
        # Strategy agent combines everything
        decision = self.strategy.decide(
            observations=observations,
            history=history,
            platform=ctx.platform
        )
        
        # ===== REMEMBER =====
        
        # Store for learning and auditing
        self.memory.store(
            user_id=ctx.user_id,
            observation=observations,
            decision=decision,
            context_summary=f"{ctx.platform or 'unknown'}: {ctx.text[:50] if ctx.text else 'image only'}"
        )
        
        # ===== RETURN =====
        
        return {
            "status": "success",
            "user_id": ctx.user_id,
            "platform": ctx.platform,
            "observations": {
                "vision": observations.get("vision", {}).get("risk", "N/A") if observations.get("vision", {}).get("analyzed") else "not analyzed",
                "content": observations.get("content", {}).get("hook_strength", "N/A") if observations.get("content", {}).get("analyzed") else "not analyzed"
            },
            "decision": decision,
            "memory_patterns": self.memory.get_patterns(ctx.user_id)
        }
    
    async def quick_analyze(self, ctx: AgentContext) -> Dict[str, Any]:
        """
        Quick analysis without full history lookup.
        Faster for real-time feedback.
        """
        
        observations = {}
        
        if ctx.has_image():
            observations["vision"] = await self.vision.analyze(ctx)
        
        if ctx.has_text():
            observations["content"] = await self.content.analyze(ctx)
        
        # Quick decision without history
        decision = self.strategy.decide(
            observations=observations,
            history={"has_data": False},
            platform=ctx.platform
        )
        
        return {
            "status": "success",
            "decision": decision
        }


# Singleton instance
orchestrator = OrchestratorAgent()
