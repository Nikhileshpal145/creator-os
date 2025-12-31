"""
Strategy Agent - The reasoning brain that combines all observations.
Makes decisions with confidence levels and explanations.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class StrategyAgent:
    """
    Combines observations from all agents to produce strategic decisions.
    
    This is the "reasoning" component that:
    - Weighs multiple signals
    - Considers user history
    - Produces actionable advice with confidence
    - Explains WHY (building trust)
    """
    
    def decide(
        self,
        observations: Dict[str, Any],
        history: Dict[str, Any],
        platform: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Make a strategic decision based on observations and history.
        
        Returns:
        - confidence: High/Medium/Low
        - advice: List of actionable recommendations
        - why: Explanation for transparency
        - score: Overall readiness score (0-100)
        - verdict: Post/Wait/Fix
        """
        
        advice = []
        warnings = []
        score = 50  # Base score
        
        # Process vision observations
        vision = observations.get("vision", {})
        if vision.get("analyzed"):
            if vision.get("risk") == "High":
                warnings.append("High visual risk")
                advice.extend(vision.get("fixes", [])[:2])
                score -= 20
            elif vision.get("risk") == "Medium":
                warnings.append("Some visual improvements possible")
                advice.extend(vision.get("fixes", [])[:1])
                score -= 10
            else:
                score += 10
        
        # Process content observations
        content = observations.get("content", {})
        if content.get("analyzed"):
            content_score = content.get("score", 50)
            score = (score + content_score) // 2  # Average with content score
            
            if content.get("issues"):
                warnings.extend(content.get("issues", [])[:2])
                advice.extend(content.get("suggestions", [])[:2])
            
            if content.get("hook_strength") == "Strong":
                score += 5
            elif content.get("hook_strength") == "Weak":
                score -= 5
        
        # Consider history
        if history.get("has_data"):
            patterns = history.get("patterns", {})
            
            # Engagement trend affects confidence
            if patterns.get("engagement_trend") == "growing":
                score += 5
                advice.append("Your recent growth suggests this content style works!")
            elif patterns.get("engagement_trend") == "declining":
                advice.append("Consider trying a different approach based on recent trends")
            
            # Use historical insights
            insights = history.get("insights", [])
            advice.extend(insights[:1])
        else:
            advice.append("I'm learning your patterns. Keep posting!")
        
        # Platform-specific adjustments
        if platform:
            platform_advice = self._get_platform_advice(platform, observations)
            advice.extend(platform_advice)
        
        # Determine confidence
        confidence = self._calculate_confidence(observations, history)
        
        # Determine verdict
        verdict = self._determine_verdict(score, warnings)
        
        # Generate explanation
        why = self._generate_explanation(observations, history, score)
        
        # Dedupe and limit advice
        advice = list(dict.fromkeys(advice))[:5]
        
        return {
            "confidence": confidence,
            "score": min(100, max(0, score)),
            "verdict": verdict,
            "advice": advice,
            "warnings": warnings,
            "why": why,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _calculate_confidence(
        self,
        observations: Dict[str, Any],
        history: Dict[str, Any]
    ) -> str:
        """Calculate confidence in the decision."""
        
        confidence_score = 0
        
        # More observations = more confidence
        if observations.get("vision", {}).get("analyzed"):
            confidence_score += 2
        if observations.get("content", {}).get("analyzed"):
            confidence_score += 2
        
        # History adds confidence
        if history.get("has_data"):
            confidence_score += 2
            if history.get("patterns", {}).get("engagement_trend") != "unknown":
                confidence_score += 1
        
        if confidence_score >= 5:
            return "High"
        elif confidence_score >= 3:
            return "Medium"
        else:
            return "Low"
    
    def _determine_verdict(self, score: int, warnings: List[str]) -> str:
        """Determine post/wait/fix verdict."""
        
        if score >= 70 and len(warnings) == 0:
            return "Post"
        elif score >= 50 or len(warnings) <= 1:
            return "Post with tweaks"
        elif score >= 30:
            return "Fix before posting"
        else:
            return "Reconsider"
    
    def _get_platform_advice(
        self,
        platform: str,
        observations: Dict[str, Any]
    ) -> List[str]:
        """Get platform-specific advice."""
        
        advice = []
        
        content = observations.get("content", {})
        details = content.get("details", {})
        
        if platform == "instagram":
            if details.get("hashtag_count", 0) < 3:
                advice.append("Add 5-10 relevant hashtags for Instagram discovery")
            if details.get("hashtag_count", 0) > 15:
                advice.append("Reduce hashtags to 10-15 for clean Instagram posting")
                
        elif platform == "twitter":
            if details.get("char_count", 0) > 250:
                advice.append("Consider shortening for Twitter's fast-scroll format")
                
        elif platform == "linkedin":
            if not content.get("has_cta"):
                advice.append("LinkedIn posts with clear CTAs get 2x more engagement")
        
        return advice
    
    def _generate_explanation(
        self,
        observations: Dict[str, Any],
        history: Dict[str, Any],
        score: int
    ) -> str:
        """Generate human-readable explanation for the decision."""
        
        reasons = []
        
        vision = observations.get("vision", {})
        content = observations.get("content", {})
        
        if vision.get("analyzed"):
            risk = vision.get("risk", "Unknown")
            reasons.append(f"Visual risk: {risk}")
        
        if content.get("analyzed"):
            hook = content.get("hook_strength", "Unknown")
            reasons.append(f"Hook strength: {hook}")
        
        if history.get("has_data"):
            trend = history.get("patterns", {}).get("engagement_trend", "stable")
            reasons.append(f"Your trend: {trend}")
        else:
            reasons.append("Limited history data")
        
        return f"Score {score}/100. Based on: {', '.join(reasons)}."


# Singleton instance
strategy_agent = StrategyAgent()
