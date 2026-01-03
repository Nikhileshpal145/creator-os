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
