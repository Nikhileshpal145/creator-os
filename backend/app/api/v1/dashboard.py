"""
Dashboard API - Protected, per-user endpoints
Provides personalized dashboard data for authenticated users.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.db.session import get_session
from app.core.dependencies import CurrentUser
from app.services.user_analytics import UserAnalyticsService

router = APIRouter()


@router.get("/overview")
async def get_dashboard_overview(
    current_user: CurrentUser,
    db: Session = Depends(get_session),
    days: int = 30
):
    """
    Get complete dashboard overview for authenticated user.
    
    Returns:
    - User profile summary
    - Platform metrics
    - AI-generated insights
    - Content recommendations
    - Recent posts performance
    - Chart data for visualization
    """
    service = UserAnalyticsService(db, current_user)
    dashboard = service.get_dashboard_data(days=days)
    
    return {
        "status": "success",
        "data": dashboard.dict()
    }


@router.get("/summary")
async def get_dashboard_summary(
    current_user: CurrentUser,
    db: Session = Depends(get_session)
):
    """Get quick summary stats for dashboard header."""
    
    service = UserAnalyticsService(db, current_user)
    summary = service._get_summary()
    
    return {
        "user": {
            "name": current_user.full_name,
            "tier": current_user.tier,
            "avatar": current_user.avatar_url
        },
        "summary": summary.dict()
    }


@router.get("/platforms")
async def get_platform_metrics(
    current_user: CurrentUser,
    db: Session = Depends(get_session)
):
    """Get detailed metrics for each connected platform."""
    
    service = UserAnalyticsService(db, current_user)
    platforms = service._get_platform_metrics()
    
    return {
        "platforms": [p.dict() for p in platforms],
        "count": len(platforms)
    }


@router.get("/insights")
async def get_ai_insights(
    current_user: CurrentUser,
    db: Session = Depends(get_session)
):
    """
    Get AI-generated insights based on user's data.
    
    Insights include:
    - Growth trends
    - Performance warnings
    - Opportunities
    - Tips and recommendations
    """
    service = UserAnalyticsService(db, current_user)
    summary = service._get_summary()
    platforms = service._get_platform_metrics()
    insights = service._generate_insights(summary, platforms)
    
    return {
        "insights": [i.dict() for i in insights],
        "generated_at": "now"
    }


@router.get("/recommendations")
async def get_content_recommendations(
    current_user: CurrentUser,
    db: Session = Depends(get_session)
):
    """Get personalized content recommendations."""
    
    service = UserAnalyticsService(db, current_user)
    platforms = service._get_platform_metrics()
    recommendations = service._generate_recommendations(platforms)
    
    return {
        "recommendations": [r.dict() for r in recommendations]
    }


@router.get("/chart/{chart_type}")
async def get_chart_data(
    chart_type: str,
    current_user: CurrentUser,
    db: Session = Depends(get_session),
    days: int = 7
):
    """
    Get chart data for visualization.
    
    Chart types:
    - views: Views over time
    - followers: Follower growth
    - engagement: Engagement metrics
    """
    service = UserAnalyticsService(db, current_user)
    
    if chart_type == "views":
        data = service._get_chart_data(days=days)
        return {"type": "views", "days": days, "data": data}
    
    elif chart_type == "platforms":
        platforms = service._get_platform_metrics()
        data = [{"name": p.platform, "views": p.views, "followers": p.followers} for p in platforms]
        return {"type": "platforms", "data": data}
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown chart type: {chart_type}")


@router.get("/posts")
async def get_recent_posts(
    current_user: CurrentUser,
    db: Session = Depends(get_session),
    limit: int = 10
):
    """Get recent posts with performance metrics."""
    
    service = UserAnalyticsService(db, current_user)
    posts = service._get_recent_posts(limit=limit)
    
    return {
        "posts": posts,
        "count": len(posts)
    }


@router.post("/refresh")
async def refresh_dashboard(
    current_user: CurrentUser,
    db: Session = Depends(get_session)
):
    """
    Trigger a dashboard data refresh.
    Clears any cached data and regenerates insights.
    """
    # For now, just return fresh data
    # In production, this might trigger background jobs
    
    service = UserAnalyticsService(db, current_user)
    dashboard = service.get_dashboard_data()
    
    return {
        "status": "refreshed",
        "data": dashboard.dict()
    }


@router.get("/onboarding-status")
async def get_onboarding_status(
    current_user: CurrentUser,
    db: Session = Depends(get_session)
):
    """Check user's onboarding progress."""
    
    service = UserAnalyticsService(db, current_user)
    summary = service._get_summary()
    
    steps = [
        {"id": "register", "name": "Create Account", "completed": True},
        {"id": "connect", "name": "Connect Platform", "completed": summary.platforms_connected > 0},
        {"id": "sync", "name": "Sync Analytics", "completed": summary.total_views > 0},
        {"id": "explore", "name": "Explore Dashboard", "completed": current_user.onboarding_completed}
    ]
    
    completed_count = sum(1 for s in steps if s["completed"])
    
    return {
        "completed": current_user.onboarding_completed,
        "current_step": current_user.onboarding_step,
        "steps": steps,
        "progress_percent": round((completed_count / len(steps)) * 100)
    }
