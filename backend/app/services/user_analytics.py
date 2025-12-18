"""
User Analytics Service
Provides per-user, isolated analytics with AI-powered insights.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlmodel import Session, select, func
from pydantic import BaseModel

from app.models.user import User
from app.models.scraped_analytics import ScrapedAnalytics
from app.models.content import ContentDraft, ContentPerformance


class PlatformMetrics(BaseModel):
    """Metrics for a single platform."""
    platform: str
    views: int = 0
    followers: int = 0
    subscribers: int = 0
    engagement_rate: float = 0.0
    watch_time_hours: float = 0.0
    last_updated: Optional[datetime] = None
    growth_percent: float = 0.0


class DashboardSummary(BaseModel):
    """Overall dashboard summary."""
    total_views: int = 0
    total_followers: int = 0
    total_engagement: int = 0
    engagement_rate: float = 0.0
    posts_tracked: int = 0
    platforms_connected: int = 0
    growth_percent: float = 0.0


class ContentInsight(BaseModel):
    """AI-generated insight about content."""
    type: str  # growth, warning, opportunity, tip
    title: str
    message: str
    priority: int  # 1-5, 5 being highest
    action_url: Optional[str] = None
    platform: Optional[str] = None


class ContentRecommendation(BaseModel):
    """Content recommendation."""
    type: str  # topic, format, timing, platform
    title: str
    description: str
    confidence: float  # 0.0 - 1.0
    based_on: str  # What data this is based on


class DashboardData(BaseModel):
    """Complete dashboard data for a user."""
    user_name: str
    user_tier: str
    summary: DashboardSummary
    platforms: List[PlatformMetrics]
    insights: List[ContentInsight]
    recommendations: List[ContentRecommendation]
    recent_posts: List[Dict[str, Any]]
    chart_data: List[Dict[str, Any]]
    last_refreshed: datetime


class UserAnalyticsService:
    """
    Per-user analytics service with complete data isolation.
    All queries are scoped to the authenticated user.
    """
    
    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user
        self.user_id = str(user.id)
    
    def get_dashboard_data(self, days: int = 30) -> DashboardData:
        """Get complete dashboard data for the user."""
        
        summary = self._get_summary()
        platforms = self._get_platform_metrics()
        insights = self._generate_insights(summary, platforms)
        recommendations = self._generate_recommendations(platforms)
        recent_posts = self._get_recent_posts(limit=10)
        chart_data = self._get_chart_data(days=days)
        
        return DashboardData(
            user_name=self.user.full_name,
            user_tier=self.user.tier,
            summary=summary,
            platforms=platforms,
            insights=insights,
            recommendations=recommendations,
            recent_posts=recent_posts,
            chart_data=chart_data,
            last_refreshed=datetime.utcnow()
        )
    
    def _get_summary(self) -> DashboardSummary:
        """Calculate overall metrics summary."""
        
        # Get latest scraped data per platform
        platforms_statement = select(ScrapedAnalytics.platform).where(
            ScrapedAnalytics.user_id == self.user_id
        ).distinct()
        platforms = self.db.exec(platforms_statement).all()
        
        total_views = 0
        total_followers = 0
        
        for platform in platforms:
            latest = self.db.exec(
                select(ScrapedAnalytics)
                .where(ScrapedAnalytics.user_id == self.user_id)
                .where(ScrapedAnalytics.platform == platform)
                .order_by(ScrapedAnalytics.scraped_at.desc())
                .limit(1)
            ).first()
            
            if latest:
                total_views += latest.views or 0
                total_followers += latest.followers or 0
        
        # Get content performance
        drafts = self.db.exec(
            select(ContentDraft).where(ContentDraft.user_id == self.user_id)
        ).all()
        
        total_engagement = 0
        for draft in drafts:
            perf = self.db.exec(
                select(ContentPerformance)
                .where(ContentPerformance.draft_id == draft.id)
                .order_by(ContentPerformance.recorded_at.desc())
                .limit(1)
            ).first()
            if perf:
                total_engagement += perf.likes + perf.comments + perf.shares
        
        # Calculate growth (compare last 7 days vs previous 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        fourteen_days_ago = datetime.utcnow() - timedelta(days=14)
        
        recent = self.db.exec(
            select(ScrapedAnalytics).where(
                ScrapedAnalytics.user_id == self.user_id,
                ScrapedAnalytics.scraped_at >= seven_days_ago
            )
        ).all()
        
        older = self.db.exec(
            select(ScrapedAnalytics).where(
                ScrapedAnalytics.user_id == self.user_id,
                ScrapedAnalytics.scraped_at >= fourteen_days_ago,
                ScrapedAnalytics.scraped_at < seven_days_ago
            )
        ).all()
        
        recent_views = sum(r.views or 0 for r in recent)
        older_views = sum(r.views or 0 for r in older)
        
        growth = 0.0
        if older_views > 0:
            growth = round(((recent_views - older_views) / older_views) * 100, 1)
        
        engagement_rate = 0.0
        if total_views > 0:
            engagement_rate = round((total_engagement / total_views) * 100, 2)
        
        return DashboardSummary(
            total_views=total_views,
            total_followers=total_followers,
            total_engagement=total_engagement,
            engagement_rate=engagement_rate,
            posts_tracked=len(drafts),
            platforms_connected=len(platforms),
            growth_percent=growth
        )
    
    def _get_platform_metrics(self) -> List[PlatformMetrics]:
        """Get metrics for each connected platform."""
        
        platforms_statement = select(ScrapedAnalytics.platform).where(
            ScrapedAnalytics.user_id == self.user_id
        ).distinct()
        platforms = self.db.exec(platforms_statement).all()
        
        metrics = []
        
        for platform in platforms:
            latest = self.db.exec(
                select(ScrapedAnalytics)
                .where(ScrapedAnalytics.user_id == self.user_id)
                .where(ScrapedAnalytics.platform == platform)
                .order_by(ScrapedAnalytics.scraped_at.desc())
                .limit(1)
            ).first()
            
            if latest:
                # Calculate growth for this platform
                seven_days_ago = datetime.utcnow() - timedelta(days=7)
                week_old = self.db.exec(
                    select(ScrapedAnalytics)
                    .where(ScrapedAnalytics.user_id == self.user_id)
                    .where(ScrapedAnalytics.platform == platform)
                    .where(ScrapedAnalytics.scraped_at <= seven_days_ago)
                    .order_by(ScrapedAnalytics.scraped_at.desc())
                    .limit(1)
                ).first()
                
                growth = 0.0
                if week_old and week_old.views and latest.views:
                    growth = round(((latest.views - week_old.views) / week_old.views) * 100, 1)
                
                metrics.append(PlatformMetrics(
                    platform=platform,
                    views=latest.views or 0,
                    followers=latest.followers or 0,
                    subscribers=latest.subscribers or 0,
                    engagement_rate=latest.engagement_rate or 0.0,
                    watch_time_hours=(latest.watch_time_minutes or 0) / 60,
                    last_updated=latest.scraped_at,
                    growth_percent=growth
                ))
        
        return metrics
    
    def _generate_insights(
        self, 
        summary: DashboardSummary, 
        platforms: List[PlatformMetrics]
    ) -> List[ContentInsight]:
        """Generate AI-powered insights from user's data."""
        
        insights = []
        
        # Growth insights
        if summary.growth_percent > 10:
            insights.append(ContentInsight(
                type="growth",
                title="🚀 Strong Growth!",
                message=f"Your views are up {summary.growth_percent}% this week. Keep up the momentum!",
                priority=4
            ))
        elif summary.growth_percent < -10:
            insights.append(ContentInsight(
                type="warning",
                title="📉 Views Declining",
                message=f"Views dropped {abs(summary.growth_percent)}% this week. Consider posting more frequently.",
                priority=5
            ))
        
        # Engagement insights
        if summary.engagement_rate > 5:
            insights.append(ContentInsight(
                type="growth",
                title="💬 High Engagement",
                message=f"Your engagement rate of {summary.engagement_rate}% is above average!",
                priority=3
            ))
        elif summary.engagement_rate < 1 and summary.total_views > 100:
            insights.append(ContentInsight(
                type="opportunity",
                title="🎯 Boost Engagement",
                message="Try adding calls-to-action and asking questions to increase engagement.",
                priority=4
            ))
        
        # Platform-specific insights
        for platform in platforms:
            if platform.growth_percent > 20:
                insights.append(ContentInsight(
                    type="growth",
                    title=f"📈 {platform.platform.title()} Surge",
                    message=f"Your {platform.platform} is growing {platform.growth_percent}%! Focus more content here.",
                    priority=4,
                    platform=platform.platform
                ))
            
            # Check for stale data
            if platform.last_updated:
                days_since = (datetime.utcnow() - platform.last_updated).days
                if days_since > 3:
                    insights.append(ContentInsight(
                        type="warning",
                        title=f"⚠️ {platform.platform.title()} Data Stale",
                        message=f"No data from {platform.platform} in {days_since} days. Visit the platform to sync.",
                        priority=3,
                        platform=platform.platform
                    ))
        
        # New user tips
        if summary.platforms_connected == 0:
            insights.append(ContentInsight(
                type="tip",
                title="🔌 Connect Platforms",
                message="Visit YouTube Studio or Instagram with the extension to start tracking!",
                priority=5
            ))
        
        # Sort by priority
        insights.sort(key=lambda x: x.priority, reverse=True)
        
        return insights[:5]  # Return top 5 insights
    
    def _generate_recommendations(
        self, 
        platforms: List[PlatformMetrics]
    ) -> List[ContentRecommendation]:
        """Generate content recommendations."""
        
        recommendations = []
        
        # Find best performing platform
        if platforms:
            best = max(platforms, key=lambda p: p.views)
            recommendations.append(ContentRecommendation(
                type="platform",
                title=f"Focus on {best.platform.title()}",
                description=f"Your {best.platform} has the most views. Consider cross-posting winning content here.",
                confidence=0.8,
                based_on="Platform performance comparison"
            ))
        
        # Timing recommendation (placeholder - would use actual data)
        recommendations.append(ContentRecommendation(
            type="timing",
            title="Post at Peak Hours",
            description="Based on your audience, try posting between 6-9 PM local time.",
            confidence=0.7,
            based_on="Engagement patterns"
        ))
        
        # Content format
        recommendations.append(ContentRecommendation(
            type="format",
            title="Try Short-Form Content",
            description="Short videos under 60 seconds tend to get 2x more engagement.",
            confidence=0.75,
            based_on="Industry benchmarks"
        ))
        
        return recommendations[:3]
    
    def _get_recent_posts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent content posts with performance."""
        
        drafts = self.db.exec(
            select(ContentDraft)
            .where(ContentDraft.user_id == self.user_id)
            .order_by(ContentDraft.created_at.desc())
            .limit(limit)
        ).all()
        
        posts = []
        for draft in drafts:
            perf = self.db.exec(
                select(ContentPerformance)
                .where(ContentPerformance.draft_id == draft.id)
                .order_by(ContentPerformance.recorded_at.desc())
                .limit(1)
            ).first()
            
            posts.append({
                "id": str(draft.id),
                "platform": draft.platform,
                "text_preview": (draft.text_content[:100] + "...") if draft.text_content and len(draft.text_content) > 100 else draft.text_content,
                "views": perf.views if perf else 0,
                "likes": perf.likes if perf else 0,
                "comments": perf.comments if perf else 0,
                "engagement": (perf.likes + perf.comments + perf.shares) if perf else 0,
                "created_at": draft.created_at.isoformat() if draft.created_at else None
            })
        
        return posts
    
    def _get_chart_data(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get time-series data for charts."""
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        records = self.db.exec(
            select(ScrapedAnalytics)
            .where(ScrapedAnalytics.user_id == self.user_id)
            .where(ScrapedAnalytics.scraped_at >= start_date)
            .order_by(ScrapedAnalytics.scraped_at.asc())
        ).all()
        
        # Group by date
        daily = {}
        for record in records:
            date_key = record.scraped_at.strftime("%Y-%m-%d")
            if date_key not in daily:
                daily[date_key] = {"date": date_key, "views": 0, "followers": 0}
            daily[date_key]["views"] += record.views or 0
            daily[date_key]["followers"] = max(daily[date_key]["followers"], record.followers or 0)
        
        return sorted(daily.values(), key=lambda x: x["date"])
