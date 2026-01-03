<<<<<<< HEAD
"""
Analytics Agent - Fetches and analyzes user's historical patterns.
Provides data-driven insights for strategy decisions.
"""

from typing import Dict, Any, List, Optional
from .context import AgentContext
from .tools import get_user_context, get_recent_posts, get_platform_patterns
import logging

logger = logging.getLogger(__name__)


class AnalyticsAgent:
    """
    Analyzes user's historical performance data.
    
    Provides:
    - Performance patterns by platform
    - Best posting times
    - Content type performance comparison
    - Engagement trends
    """
    
    def fetch_user_patterns(self, user_id: str) -> Dict[str, Any]:
        """
        Fetch comprehensive user patterns from historical data.
        """
        
        try:
            # Get user context
            context = get_user_context(user_id)
            
            # Get recent posts
            posts = get_recent_posts(user_id, limit=50)
            
            if not posts:
                return {
                    "has_data": False,
                    "message": "No historical data yet",
                    "recommendations": [
                        "Start posting with the extension active",
                        "Visit your social media analytics pages"
                    ]
                }
            
            # Analyze patterns
            patterns = self._analyze_patterns(posts)
            
            return {
                "has_data": True,
                "user_tier": context.get("tier", "free"),
                "total_posts_analyzed": len(posts),
                "platforms": context.get("platforms", {}),
                "patterns": patterns,
                "insights": self._generate_insights(patterns)
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch user patterns: {e}")
            return {
                "has_data": False,
                "error": str(e)
            }
    
    def get_platform_performance(
        self,
        user_id: str,
        platform: str
    ) -> Dict[str, Any]:
        """Get performance data for specific platform."""
        
        return get_platform_patterns(user_id, platform)
    
    def compare_platforms(self, user_id: str) -> Dict[str, Any]:
        """Compare performance across platforms."""
        
        platforms = ["instagram", "youtube", "twitter", "linkedin"]
        comparison = {}
        
        for platform in platforms:
            data = get_platform_patterns(user_id, platform)
            if data.get("has_data"):
                comparison[platform] = {
                    "posts": data.get("post_count", 0),
                    "avg_views": data.get("avg_views", 0),
                    "avg_engagement": data.get("avg_engagement", 0)
                }
        
        # Determine best platform
        best_platform = None
        best_engagement = 0
        
        for platform, data in comparison.items():
            if data["avg_engagement"] > best_engagement:
                best_engagement = data["avg_engagement"]
                best_platform = platform
        
        return {
            "comparison": comparison,
            "best_platform": best_platform,
            "recommendation": f"Focus on {best_platform}" if best_platform else "Need more data"
        }
    
    def _analyze_patterns(self, posts: List[Dict]) -> Dict[str, Any]:
        """Analyze patterns from post history."""
        
        patterns = {
            "posting_frequency": "unknown",
            "best_day": "unknown",
            "best_hour": "unknown",
            "avg_engagement": 0,
            "engagement_trend": "stable"
        }
        
        if not posts:
            return patterns
        
        # Calculate average engagement
        engagements = [p.get("metrics", {}).get("engagement", 0) for p in posts]
        valid_engagements = [e for e in engagements if e > 0]
        
        if valid_engagements:
            patterns["avg_engagement"] = sum(valid_engagements) // len(valid_engagements)
            
            # Trend analysis (first half vs second half)
            mid = len(valid_engagements) // 2
            if mid > 0:
                first_half = sum(valid_engagements[:mid]) / mid
                second_half = sum(valid_engagements[mid:]) / (len(valid_engagements) - mid)
                
                if second_half > first_half * 1.1:
                    patterns["engagement_trend"] = "growing"
                elif second_half < first_half * 0.9:
                    patterns["engagement_trend"] = "declining"
        
        # Best posting times (would need timestamp data)
        patterns["best_hour"] = "8 PM"  # Default recommendation
        patterns["best_day"] = "Tuesday"  # Default recommendation
        
        return patterns
    
    def _generate_insights(self, patterns: Dict[str, Any]) -> List[str]:
        """Generate actionable insights from patterns."""
        
        insights = []
        
        # Engagement trend insights
        if patterns.get("engagement_trend") == "growing":
            insights.append("Your engagement is growing! Keep up your current strategy.")
        elif patterns.get("engagement_trend") == "declining":
            insights.append("Engagement has been declining. Consider refreshing your content style.")
        
        # Posting time insights
        if patterns.get("best_hour"):
            insights.append(f"Your best posting time appears to be around {patterns['best_hour']}.")
        
        # Average engagement context
        avg = patterns.get("avg_engagement", 0)
        if avg > 1000:
            insights.append("Strong engagement! You're doing well.")
        elif avg > 100:
            insights.append("Good engagement. Focus on hook optimization to grow.")
        else:
            insights.append("Building engagement takes time. Stay consistent!")
        
        return insights


# Singleton instance
analytics_agent = AnalyticsAgent()
=======
# backend/app/agents/analytics_agent.py
"""Analytics agent that runs the core Jarvis analysis engine.
It expects ``ctx['posts']`` to be a list of post dictionaries.
"""

from sqlmodel import select, Session
from app.db.session import engine
from app.models.scraped_analytics import ScrapedAnalytics
from .base import BaseAgent
from ..services.analysis_engine import AnalysisEngine


class AnalyticsAgent(BaseAgent):
    name = "analytics"

    async def should_run(self, ctx):
        return bool(ctx.get("posts"))

    async def run(self, ctx):
        engine_instance = AnalysisEngine(content_data=ctx["posts"])
        # Run both trend analysis and content clustering
        return {
            "trend": engine_instance.trend_analysis(),
            "clusters": engine_instance.content_clustering(),
        }

    def fetch_user_patterns(self, user_id: str):
        """Fetch and analyze historical patterns for a user."""
        with Session(engine) as session:
            stmt = select(ScrapedAnalytics).where(ScrapedAnalytics.user_id == user_id)
            results = session.exec(stmt).all()
            
            # Map DB results to the format expected by AnalysisEngine
            formatted_data = []
            for r in results:
                item = r.dict()
                # Ensure 'engagement' and 'created_at' exist for AnalysisEngine
                if item.get("engagement_rate"):
                    item["engagement"] = item["engagement_rate"]
                if item.get("scraped_at"):
                    item["created_at"] = item["scraped_at"]
                formatted_data.append(item)

            analysis_engine = AnalysisEngine(content_data=formatted_data)
            return analysis_engine.run_full_analysis()
>>>>>>> temp_work
