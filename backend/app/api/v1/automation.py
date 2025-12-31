from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
from app.core.celery_app import celery_app

router = APIRouter()


class TriggerTaskRequest(BaseModel):
    user_id: str
    task_name: str
    args: Optional[dict] = None


@router.get("/status")
async def get_automation_status():
    """
    Get automation engine status.
    """
    if not celery_app:
        return {
            "status": "not_configured",
            "message": "Celery app failed to initialize"
        }
    
    try:
        # Check specific queue length or status
        inspect = celery_app.control.inspect()
        active = inspect.active()
        
        return {
            "status": "connected" if active else "waiting_for_workers",
            "workers": list(active.keys()) if active else [],
            "message": "Automation engine is ready" if active else "Waiting for Celery workers to connect..."
        }
    except Exception as e:
        return {
            "status": "disconnected",
            "error": str(e),
            "message": "Redis not reachable"
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
                "schedule": "Every hour (Periodic)"
            },
            {
                "name": "check_scheduled_posts",
                "description": "Check for pending scheduled posts",
                "schedule": "Every minute (Periodic)"
            },
            {
                "name": "generate_weekly_report",
                "description": "Generate weekly performance report",
                "schedule": "Every Monday 9 AM"
            }
        ]
    }


@router.post("/trigger")
async def trigger_task(request: TriggerTaskRequest):
    """
    Manually trigger an automation task.
    """
    task_mapping = {
        "sync_analytics": "app.worker.sync_analytics",
        "generate_weekly_report": "app.worker.generate_weekly_report",
        "check_scheduled_posts": "app.worker.check_scheduled_posts",
        "publish_post": "app.worker.publish_post"
    }
    
    full_task_name = task_mapping.get(request.task_name)
    
    if not full_task_name:
        raise HTTPException(status_code=400, detail=f"Unknown task: {request.task_name}")
    
    try:
        # Send task to Celery
        if request.task_name == "publish_post":
             # Special case: publish requires draft_id in args
             draft_id = request.args.get("draft_id") if request.args else None
             if not draft_id:
                 raise HTTPException(status_code=400, detail="draft_id required for publish_post")
             task = celery_app.send_task(full_task_name, args=[draft_id])
        else:
             # Standard tasks take user_id or empty args
             task = celery_app.send_task(
                full_task_name,
                args=[request.user_id] if request.task_name not in ["check_scheduled_posts"] else [],
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
            "message": "Failed to queue task"
        }


@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """
    Get status of a triggered task.
    """
    try:
        result = celery_app.AsyncResult(task_id)
        
        # Check if result is ready/successful
        status = result.status
        output = None
        if result.ready():
            try:
               output = result.result
               if isinstance(output, Exception):
                   output = str(output)
                   status = "FAILURE"
            except Exception:
               output = "Result serialization error"
        
        return {
            "task_id": task_id,
            "status": status,
            "result": output,
            "ready": result.ready()
        }
    except Exception as e:
        return {
            "task_id": task_id,
            "status": "unknown",
            "error": str(e)
        }


