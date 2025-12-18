from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
import json

router = APIRouter()


class TriggerTaskRequest(BaseModel):
    user_id: str
    task_name: str
    args: Optional[dict] = None


def _get_celery_app():
    """Get celery app - imports only when needed."""
    try:
        from celery import Celery
        return Celery("creator_os", broker="redis://localhost:6379/0")
    except Exception as e:
        return None


@router.get("/status")
async def get_automation_status():
    """
    Get automation engine status.
    """
    celery_app = _get_celery_app()
    
    if not celery_app:
        return {
            "status": "not_configured",
            "message": "Celery not available"
        }
    
    try:
        # Check if Celery is connected
        inspect = celery_app.control.inspect()
        active = inspect.active()
        
        return {
            "status": "connected" if active else "no_workers",
            "workers": list(active.keys()) if active else [],
            "message": "Automation engine is running" if active else "Start Celery workers to enable automation"
        }
    except Exception as e:
        return {
            "status": "disconnected",
            "error": str(e),
            "message": "Redis or Celery not available. Start docker-compose first."
        }


@router.get("/tasks")
async def get_available_tasks():
    """
    Get list of available automation tasks.
    """
    return {
        "tasks": [
            {
                "name": "sync_analytics",
                "description": "Sync analytics from all platforms",
                "schedule": "Every hour"
            },
            {
                "name": "generate_weekly_report",
                "description": "Generate weekly performance report",
                "schedule": "Every Monday 9 AM"
            },
            {
                "name": "check_engagement_alerts",
                "description": "Check for engagement drops/spikes",
                "schedule": "Every 4 hours"
            },
            {
                "name": "analyze_content",
                "description": "Run multimodal analysis on content",
                "schedule": "On demand"
            },
            {
                "name": "generate_content_ideas",
                "description": "Generate AI content ideas",
                "schedule": "On demand"
            },
            {
                "name": "scan_competitors",
                "description": "Scan competitor accounts",
                "schedule": "Daily 6 AM"
            }
        ]
    }


@router.post("/trigger")
async def trigger_task(request: TriggerTaskRequest):
    """
    Manually trigger an automation task.
    """
    celery_app = _get_celery_app()
    
    task_mapping = {
        "sync_analytics": "tasks.sync_analytics",
        "generate_weekly_report": "tasks.generate_weekly_report",
        "check_engagement_alerts": "tasks.check_engagement_alerts",
        "analyze_content": "tasks.analyze_content",
        "generate_content_ideas": "tasks.generate_content_ideas",
        "scan_competitors": "tasks.scan_competitors"
    }
    
    full_task_name = task_mapping.get(request.task_name)
    
    if not full_task_name:
        raise HTTPException(status_code=400, detail=f"Unknown task: {request.task_name}")
    
    if not celery_app:
        return {
            "status": "mock",
            "task_name": request.task_name,
            "message": "Task would be queued when Celery is running"
        }
    
    try:
        # Send task to Celery
        task = celery_app.send_task(
            full_task_name,
            args=[request.user_id],
            kwargs=request.args or {}
        )
        
        return {
            "status": "queued",
            "task_id": task.id,
            "task_name": request.task_name,
            "message": "Task queued for execution"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "Failed to queue task. Is Redis running?"
        }


@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """
    Get status of a triggered task.
    """
    celery_app = _get_celery_app()
    
    if not celery_app:
        return {"task_id": task_id, "status": "unknown", "message": "Celery not configured"}
    
    try:
        result = celery_app.AsyncResult(task_id)
        
        return {
            "task_id": task_id,
            "status": result.status,
            "result": result.result if result.ready() else None,
            "ready": result.ready()
        }
    except Exception as e:
        return {
            "task_id": task_id,
            "status": "unknown",
            "error": str(e)
        }

