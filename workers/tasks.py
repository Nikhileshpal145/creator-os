"""
Celery Tasks for Creator OS Automation Engine

Multi-user aware scheduled tasks:
- Analytics sync (per user)
- Weekly reports  
- Engagement alerts
- Content analysis
"""

from .celery_app import celery_app
from datetime import datetime, timedelta
from typing import Dict, Any, List


# ========================================
# MULTI-USER HELPERS
# ========================================

def get_all_users_with_accounts() -> List[str]:
    """Get all user IDs that have connected social accounts."""
    try:
        from app.db.session import get_session
        from sqlmodel import select
        from app.models.social_account import SocialAccount
        
        with next(get_session()) as db:
            statement = select(SocialAccount.user_id).distinct().where(
                SocialAccount.is_active == True
            )
            result = db.exec(statement).all()
            return list(set(result))
    except Exception as e:
        print(f"Failed to get users: {e}")
        return []


# ========================================
# ANALYTICS TASKS
# ========================================

@celery_app.task(name="tasks.sync_analytics")
def sync_analytics(user_id: str) -> Dict[str, Any]:
    """
    Sync analytics from all connected platforms.
    Runs hourly.
    """
    print(f"📊 Syncing analytics for user: {user_id}")
    
    # TODO: Call integration connectors
    # youtube_data = YouTubeConnector().get_channel_stats()
    # instagram_data = InstagramConnector().get_profile_insights()
    
    return {
        "status": "success",
        "user_id": user_id,
        "synced_at": datetime.utcnow().isoformat(),
        "platforms_synced": ["youtube", "instagram", "twitter"]
    }


@celery_app.task(name="tasks.generate_weekly_report")
def generate_weekly_report(user_id: str) -> Dict[str, Any]:
    """
    Generate weekly performance report using AI analysis.
    Runs every Monday at 9 AM.
    """
    print(f"📈 Generating AI-powered weekly report for: {user_id}")
    
    try:
        # Import inside task to avoid circular imports
        from app.db.session import get_session
        from app.services.nl_query_service import NLQueryService
        from app.services.analysis_engine import AnalysisEngine
        
        with next(get_session()) as db:
            # Use NLQueryService to build context
            query_service = NLQueryService(db, user_id)
            context = query_service.build_context()
            
            if not context.get("has_data"):
                return {
                    "status": "no_data",
                    "user_id": user_id,
                    "message": "Not enough data for report"
                }
            
            # Run analysis
            analysis = AnalysisEngine(
                content_data=context.get("posts", []),
                patterns=context.get("patterns", [])
            ).run_full_analysis("weekly summary")
            
            # Build report
            summary = context.get("summary", {})
            report = {
                "user_id": user_id,
                "period": "last_7_days",
                "generated_at": datetime.utcnow().isoformat(),
                "summary": {
                    "total_views": summary.get("total_views", 0),
                    "total_engagement": summary.get("total_likes", 0) + summary.get("total_comments", 0),
                    "total_posts": summary.get("total_posts", 0),
                    "platforms": list(summary.get("platforms", {}).keys()),
                    "trend": analysis.get("trend", {}).get("trend_direction", "stable"),
                    "change_percent": analysis.get("trend", {}).get("change_percent", 0)
                },
                "insights": analysis.get("reason", ""),
                "recommendations": [a.get("title") for a in analysis.get("actions", [])[:5]],
                "confidence": analysis.get("confidence", 0)
            }
            
            # Send notification via WebSocket if user is connected
            try:
                import requests
                requests.post(
                    "http://localhost:8000/api/v1/stream/notify",
                    json={
                        "user_id": user_id,
                        "notification_type": "weekly_report",
                        "title": "Weekly Report Ready",
                        "message": f"Your weekly performance report is ready. {analysis.get('reason', '')}",
                        "data": {"report_id": user_id}
                    },
                    timeout=5
                )
            except Exception as notify_error:
                print(f"Could not send notification: {notify_error}")
            
            return {
                "status": "success",
                "report": report
            }
            
    except Exception as e:
        print(f"❌ Report generation failed: {e}")
        return {
            "status": "error",
            "user_id": user_id,
            "error": str(e)
        }


@celery_app.task(name="tasks.check_engagement_alerts")
def check_engagement_alerts(user_id: str) -> Dict[str, Any]:
    """
    Check for sudden engagement drops or spikes using real data.
    Runs every 4 hours.
    """
    print(f"🔔 Checking engagement alerts for: {user_id}")
    
    alerts = []
    
    try:
        from app.db.session import get_session
        from app.models.scraped_analytics import ScrapedAnalytics
        from sqlmodel import select
        from datetime import datetime, timedelta
        
        with next(get_session()) as db:
            # Get recent data (last 24 hours)
            recent_cutoff = datetime.utcnow() - timedelta(hours=24)
            recent_stmt = select(ScrapedAnalytics).where(
                ScrapedAnalytics.user_id == user_id,
                ScrapedAnalytics.scraped_at >= recent_cutoff
            )
            recent_data = db.exec(recent_stmt).all()
            
            # Get baseline data (7-30 days ago)
            baseline_start = datetime.utcnow() - timedelta(days=30)
            baseline_end = datetime.utcnow() - timedelta(days=7)
            baseline_stmt = select(ScrapedAnalytics).where(
                ScrapedAnalytics.user_id == user_id,
                ScrapedAnalytics.scraped_at >= baseline_start,
                ScrapedAnalytics.scraped_at <= baseline_end
            )
            baseline_data = db.exec(baseline_stmt).all()
            
            if not recent_data or not baseline_data:
                return {
                    "status": "insufficient_data",
                    "user_id": user_id,
                    "alerts": [],
                    "message": "Need more data history for anomaly detection"
                }
            
            # Calculate engagement metrics
            def calc_avg_engagement(data_list):
                total = 0
                count = 0
                for d in data_list:
                    if d.raw_metrics:
                        eng = d.raw_metrics.get("engagement", 0) or d.raw_metrics.get("likes", 0)
                        if eng:
                            total += eng
                            count += 1
                return total / count if count > 0 else 0
            
            recent_avg = calc_avg_engagement(recent_data)
            baseline_avg = calc_avg_engagement(baseline_data)
            
            if baseline_avg > 0:
                change_percent = ((recent_avg - baseline_avg) / baseline_avg) * 100
                
                # Engagement drop alert (>30% drop)
                if change_percent < -30:
                    alerts.append({
                        "type": "engagement_drop",
                        "severity": "warning",
                        "message": f"Engagement dropped {abs(change_percent):.1f}% in the last 24 hours",
                        "action": "Review recent content strategy and posting consistency",
                        "data": {"recent_avg": recent_avg, "baseline_avg": baseline_avg}
                    })
                
                # Viral alert (>100% increase)
                elif change_percent > 100:
                    alerts.append({
                        "type": "viral_alert",
                        "severity": "info",
                        "message": f"Your content is performing {change_percent:.1f}% above average!",
                        "action": "Engage with comments to maximize reach and momentum",
                        "data": {"recent_avg": recent_avg, "baseline_avg": baseline_avg}
                    })
                
                # Growth alert (>50% increase)
                elif change_percent > 50:
                    alerts.append({
                        "type": "growth_momentum",
                        "severity": "info",
                        "message": f"Nice growth! Engagement up {change_percent:.1f}%",
                        "action": "Keep posting at this pace to maintain momentum"
                    })
            
            # Send alerts via WebSocket if user is connected
            if alerts:
                try:
                    import requests
                    for alert in alerts:
                        requests.post(
                            "http://localhost:8000/api/v1/stream/notify",
                            json={
                                "user_id": user_id,
                                "notification_type": alert["type"],
                                "title": alert["type"].replace("_", " ").title(),
                                "message": alert["message"],
                                "data": alert
                            },
                            timeout=5
                        )
                except Exception as notify_error:
                    print(f"Could not send alert notification: {notify_error}")
            
            return {
                "status": "success",
                "user_id": user_id,
                "checked_at": datetime.utcnow().isoformat(),
                "alerts": alerts,
                "alert_count": len(alerts),
                "metrics": {
                    "recent_avg": recent_avg,
                    "baseline_avg": baseline_avg,
                    "change_percent": change_percent if baseline_avg > 0 else 0
                }
            }
            
    except Exception as e:
        print(f"❌ Alert check failed: {e}")
        return {
            "status": "error",
            "user_id": user_id,
            "error": str(e),
            "alerts": []
        }




@celery_app.task(name="tasks.analyze_content")
def analyze_content(content_id: str, image_url: str = None) -> Dict[str, Any]:
    """
    Run multimodal analysis on new content.
    Triggered when content is uploaded.
    """
    print(f"🖼️ Analyzing content: {content_id}")
    
    result = {
        "content_id": content_id,
        "analyzed_at": datetime.utcnow().isoformat()
    }
    
    if image_url:
        # TODO: Call MultimodalService
        # analysis = get_multimodal_service().analyze_image(image_url)
        result["image_analysis"] = {
            "has_face": True,
            "dominant_colors": ["blue", "white"],
            "quality_score": 0.85
        }
    
    return {
        "status": "success",
        "result": result
    }


# ========================================
# AUTOMATION TASKS
# ========================================

@celery_app.task(name="tasks.generate_content_ideas")
def generate_content_ideas(user_id: str, count: int = 10) -> Dict[str, Any]:
    """
    Generate content ideas based on analytics patterns.
    Can be triggered by user or scheduled.
    """
    print(f"💡 Generating {count} content ideas for: {user_id}")
    
    # TODO: Use LLM + analytics context
    ideas = [
        {"title": "10 lessons from building AI agents", "type": "thread", "expected_engagement": "+45%"},
        {"title": "Behind the scenes of my morning routine", "type": "reel", "expected_engagement": "+65%"},
        {"title": "Comparison: Old vs new approach", "type": "carousel", "expected_engagement": "+30%"},
    ]
    
    return {
        "status": "success",
        "user_id": user_id,
        "ideas": ideas[:count],
        "generated_at": datetime.utcnow().isoformat()
    }


@celery_app.task(name="tasks.send_notification")
def send_notification(
    user_id: str,
    channel: str,  # email, telegram, discord, slack
    message: str,
    priority: str = "normal"
) -> Dict[str, Any]:
    """
    Send notification to user via specified channel.
    """
    print(f"📬 Sending {priority} notification to {user_id} via {channel}")
    
    # TODO: Implement notification channels
    # if channel == "telegram":
    #     TelegramBot().send_message(user_id, message)
    # elif channel == "discord":
    #     DiscordWebhook().send(message)
    # elif channel == "email":
    #     send_email(user_id, message)
    
    return {
        "status": "sent",
        "channel": channel,
        "user_id": user_id,
        "message_preview": message[:100],
        "sent_at": datetime.utcnow().isoformat()
    }


# ========================================
# COMPETITOR MONITORING
# ========================================

@celery_app.task(name="tasks.scan_competitors")
def scan_competitors(user_id: str, competitor_ids: list = None) -> Dict[str, Any]:
    """
    Scan competitor accounts for trending content.
    Runs daily.
    """
    print(f"🔍 Scanning competitors for: {user_id}")
    
    # TODO: Fetch competitor data from integrations
    
    return {
        "status": "success",
        "user_id": user_id,
        "competitors_scanned": len(competitor_ids or []),
        "scanned_at": datetime.utcnow().isoformat(),
        "trending_topics": [
            "AI automation",
            "Content strategy",
            "Personal brand building"
        ]
    }
