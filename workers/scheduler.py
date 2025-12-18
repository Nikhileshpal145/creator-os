"""
Celery Beat Scheduler Configuration

Defines periodic tasks for the automation engine.
"""

from celery.schedules import crontab


# Beat schedule for periodic tasks
beat_schedule = {
    # Sync analytics every hour
    "sync-analytics-hourly": {
        "task": "tasks.sync_analytics",
        "schedule": 3600.0,  # Every hour
        "args": ("default-user",),
        "options": {"queue": "main-queue"}
    },
    
    # Generate weekly report every Monday at 9 AM
    "weekly-report-monday": {
        "task": "tasks.generate_weekly_report",
        "schedule": crontab(hour=9, minute=0, day_of_week=1),
        "args": ("default-user",),
        "options": {"queue": "main-queue"}
    },
    
    # Check for engagement alerts every 4 hours
    "engagement-alerts": {
        "task": "tasks.check_engagement_alerts",
        "schedule": 14400.0,  # Every 4 hours
        "args": ("default-user",),
        "options": {"queue": "main-queue"}
    },
    
    # Scan competitors daily at 6 AM
    "daily-competitor-scan": {
        "task": "tasks.scan_competitors",
        "schedule": crontab(hour=6, minute=0),
        "args": ("default-user",),
        "options": {"queue": "main-queue"}
    },
}


def configure_beat(celery_app):
    """Apply beat schedule to celery app."""
    celery_app.conf.beat_schedule = beat_schedule
    celery_app.conf.timezone = "UTC"
    return celery_app
