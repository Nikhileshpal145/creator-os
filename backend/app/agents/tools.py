"""
Agent Tools - Registry of callable tools for agents.
Tools are functions that agents can invoke to get real data.
"""

from typing import Dict, Any, Callable, Optional, List
from app.models.scraped_analytics import ScrapedAnalytics
from app.models.user import User
from sqlmodel import Session, select
from app.db.session import engine
import logging

logger = logging.getLogger(__name__)


def get_user_context(user_id: str) -> Dict[str, Any]:
    """Get comprehensive user context for agent reasoning."""
    
    try:
        with Session(engine) as session:
            # Get user info
            user = session.exec(select(User).where(User.id == user_id)).first()
            
            # Get recent analytics
            analytics = session.exec(
                select(ScrapedAnalytics)
                .where(ScrapedAnalytics.user_id == user_id)
                .order_by(ScrapedAnalytics.scraped_at.desc())
                .limit(20)
            ).all()
            
            platforms = {}
            for a in analytics:
                if a.platform not in platforms:
                    platforms[a.platform] = {
                        "count": 0,
                        "metrics": {}
                    }
                platforms[a.platform]["count"] += 1
                if a.raw_metrics:
                    for k, v in a.raw_metrics.items():
                        if k not in platforms[a.platform]["metrics"]:
                            platforms[a.platform]["metrics"][k] = []
                        platforms[a.platform]["metrics"][k].append(v)
            
            return {
                "user_id": user_id,
                "email": user.email if user else None,
                "tier": user.tier if user else "free",
                "platforms": platforms,
                "total_data_points": len(analytics)
            }
    except Exception as e:
        logger.error(f"Failed to get user context: {e}")
        return {"user_id": user_id, "error": str(e)}


def get_recent_posts(user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Get user's recent posts/content."""
    
    try:
        with Session(engine) as session:
            analytics = session.exec(
                select(ScrapedAnalytics)
                .where(ScrapedAnalytics.user_id == user_id)
                .order_by(ScrapedAnalytics.scraped_at.desc())
                .limit(limit)
            ).all()
            
            return [
                {
                    "platform": a.platform,
                    "scraped_at": a.scraped_at.isoformat() if a.scraped_at else None,
                    "metrics": a.raw_metrics or {}
                }
                for a in analytics
            ]
    except Exception as e:
        logger.error(f"Failed to get recent posts: {e}")
        return []


def get_platform_patterns(user_id: str, platform: str) -> Dict[str, Any]:
    """Get performance patterns for a specific platform."""
    
    posts = get_recent_posts(user_id, limit=50)
    platform_posts = [p for p in posts if p.get("platform") == platform]
    
    if not platform_posts:
        return {"has_data": False, "platform": platform}
    
    # Aggregate metrics
    total_views = sum(p.get("metrics", {}).get("views", 0) for p in platform_posts)
    total_engagement = sum(p.get("metrics", {}).get("engagement", 0) for p in platform_posts)
    
    return {
        "has_data": True,
        "platform": platform,
        "post_count": len(platform_posts),
        "avg_views": total_views // max(len(platform_posts), 1),
        "avg_engagement": total_engagement // max(len(platform_posts), 1)
    }


def predict_performance(
    platform: str,
    has_face: bool,
    caption_length: int,
    posting_hour: int
) -> Dict[str, Any]:
    """Predict post performance based on known factors."""
    
    score = 50  # Base score
    
    # Face presence (major factor)
    if has_face:
        score += 20
    
    # Caption length optimization
    if platform == "instagram" and 100 <= caption_length <= 300:
        score += 10
    elif platform == "twitter" and caption_length <= 200:
        score += 10
    elif platform == "linkedin" and 150 <= caption_length <= 400:
        score += 10
    
    # Posting time
    if posting_hour in [8, 9, 12, 17, 18, 19, 20, 21]:
        score += 10
    
    prediction = "High Potential" if score >= 75 else "Medium Potential" if score >= 55 else "Low Potential"
    
    return {
        "score": min(100, score),
        "prediction": prediction,
        "factors": {
            "face": "✓" if has_face else "✗",
            "caption": "optimal" if score >= 60 else "needs work",
            "timing": "good" if posting_hour in [8, 12, 18, 20] else "suboptimal"
        }
    }


# Tool registry - agents access tools through this
TOOLS: Dict[str, Callable] = {
    "get_user_context": get_user_context,
    "get_recent_posts": get_recent_posts,
    "get_platform_patterns": get_platform_patterns,
    "predict_performance": predict_performance,
}


def call_tool(tool_name: str, **kwargs) -> Any:
    """Safely call a tool by name."""
    if tool_name not in TOOLS:
        raise ValueError(f"Unknown tool: {tool_name}")
    return TOOLS[tool_name](**kwargs)
