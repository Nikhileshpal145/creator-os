"""
JARVIS Agent - Conversational AI interface with tool access.
Named after the famous AI assistant, provides human-like conversations
backed by real data and agent capabilities.
"""

from typing import Dict, Any, List, Optional
from .context import AgentContext
from .tools import TOOLS, call_tool
from .orchestrator import orchestrator
import logging

logger = logging.getLogger(__name__)


class JarvisAgent:
    """
    Conversational AI assistant that:
    - Answers questions using real user data
    - Provides personalized, actionable advice
    - Can trigger full agent analysis
    - Explains reasoning transparently
    """
    
    # System prompt that defines JARVIS personality
    SYSTEM_PROMPT = """You are JARVIS, the AI assistant for Creator OS.
    
Your role:
- Help content creators grow their social media presence
- Answer questions using ONLY the provided data (never make up numbers)
- Be specific and actionable in your advice
- Explain your reasoning briefly
- Be conversational but efficient

When you don't have data, say so honestly and tell them how to collect it.
When giving advice, cite specific patterns from their data.
"""
    
    async def respond(
        self,
        query: str,
        user_id: str,
        additional_context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Generate a conversational response to user query.
        
        Args:
            query: User's question
            user_id: User identifier
            additional_context: Optional context from current page
            
        Returns:
            Response with message and optional actions
        """
        
        # Get user context via tools
        user_context = call_tool("get_user_context", user_id=user_id)
        recent_posts = call_tool("get_recent_posts", user_id=user_id, limit=10)
        
        # Detect intent
        intent = self._detect_intent(query)
        
        # Build context for LLM
        context_str = self._format_context(user_context, recent_posts, additional_context)
        
        # Generate response
        response = await self._generate_response(query, context_str, intent)
        
        return {
            "status": "success",
            "message": response,
            "intent": intent,
            "actions": self._suggest_actions(intent, user_context)
        }
    
    async def analyze_and_respond(
        self,
        query: str,
        ctx: AgentContext
    ) -> Dict[str, Any]:
        """
        Run full analysis and respond conversationally.
        Use this when user asks about a specific post/image.
        """
        
        # Run full orchestrator
        analysis = await orchestrator.run(ctx)
        decision = analysis.get("decision", {})
        
        # Format as conversational response
        response = self._format_analysis_response(decision, ctx.platform)
        
        return {
            "status": "success",
            "message": response,
            "analysis": analysis,
            "score": decision.get("score", 0),
            "verdict": decision.get("verdict", "Unknown")
        }
    
    def _detect_intent(self, query: str) -> str:
        """Detect user intent from query."""
        
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['should i post', 'is this good', 'analyze']):
            return "analyze_post"
        elif any(word in query_lower for word in ['best time', 'when', 'timing']):
            return "posting_time"
        elif any(word in query_lower for word in ['grow', 'improve', 'strategy']):
            return "growth_advice"
        elif any(word in query_lower for word in ['performing', 'stats', 'analytics']):
            return "performance_check"
        elif any(word in query_lower for word in ['competitor', 'compare', 'others']):
            return "competitor_analysis"
        else:
            return "general"
    
    def _format_context(
        self,
        user_context: Dict,
        recent_posts: List[Dict],
        additional: Optional[Dict]
    ) -> str:
        """Format context for LLM consumption."""
        
        parts = [
            f"User tier: {user_context.get('tier', 'free')}",
            f"Data points: {user_context.get('total_data_points', 0)}",
        ]
        
        platforms = user_context.get('platforms', {})
        if platforms:
            parts.append(f"Platforms: {', '.join(platforms.keys())}")
        
        if recent_posts:
            parts.append(f"Recent posts analyzed: {len(recent_posts)}")
        
        if additional:
            parts.append(f"Current context: {additional}")
        
        return "\n".join(parts)
    
    async def _generate_response(
        self,
        query: str,
        context: str,
        intent: str
    ) -> str:
        """Generate LLM response."""
        
        try:
            # Try to use the existing agent service
            from app.services.agent_service import CreatorAgent
            
            agent = CreatorAgent(user_id="jarvis")
            
            prompt = f"""Context:
{context}

User Question: {query}

Respond as JARVIS. Be specific, actionable, and cite data when available.
If data is limited, be honest and suggest how to collect more."""
            
            response = await agent.chat(prompt)
            
            if response and response.get("content"):
                return response["content"]
            else:
                return self._get_fallback_response(intent, context)
                
        except Exception as e:
            logger.error(f"JARVIS LLM generation failed: {e}")
            return self._get_fallback_response(intent, context)
    
    def _get_fallback_response(self, intent: str, context: str) -> str:
        """Fallback responses when LLM is unavailable."""
        
        responses = {
            "analyze_post": "I'd love to analyze your post! Please ensure an image or caption is provided so I can give you specific feedback.",
            "posting_time": "Based on general patterns, try posting between 6-9 PM when engagement is highest. With more of your data, I can personalize this.",
            "growth_advice": "Focus on consistency and engaging hooks in your first line. Would you like me to analyze a specific post?",
            "performance_check": "I can see some of your data. For detailed analytics, visit your platform dashboards with the extension active.",
            "competitor_analysis": "Competitor analysis requires premium features. Would you like to know about upgrading?",
            "general": "I'm JARVIS, your Creator OS assistant. How can I help you grow your presence today?"
        }
        
        return responses.get(intent, responses["general"])
    
    def _format_analysis_response(self, decision: Dict, platform: Optional[str]) -> str:
        """Format analysis decision as conversational response."""
        
        score = decision.get("score", 0)
        verdict = decision.get("verdict", "Unknown")
        advice = decision.get("advice", [])
        why = decision.get("why", "")
        
        # Build conversational response
        if score >= 70:
            opener = f"Great news! Your post scores {score}/100. {verdict}! 🎯"
        elif score >= 50:
            opener = f"Your post scores {score}/100. {verdict} - a few tweaks will help."
        else:
            opener = f"Score: {score}/100. I'd suggest making changes before posting."
        
        tips = "\n".join([f"• {tip}" for tip in advice[:3]])
        
        return f"{opener}\n\n**My Suggestions:**\n{tips}\n\n*{why}*"
    
    def _suggest_actions(self, intent: str, context: Dict) -> List[Dict]:
        """Suggest follow-up actions based on intent."""
        
        actions = []
        
        if intent == "analyze_post":
            actions.append({
                "type": "action",
                "label": "Upload image for analysis",
                "action": "upload_image"
            })
        
        if context.get("total_data_points", 0) < 5:
            actions.append({
                "type": "info",
                "label": "Collect more data",
                "message": "Visit your social platforms with extension active"
            })
        
        return actions


# Singleton instance
jarvis = JarvisAgent()
