# backend/app/api/v1/agent_schedule.py
"""Endpoint to schedule a future agent run.
It accepts a payload with the same fields as /api/v1/agent/run plus a
``run_at`` ISO‑8601 timestamp. The request returns immediately and a
background task will invoke the orchestrator at the requested time.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import asyncio

from app.agents.orchestrator import OrchestratorAgent

router = APIRouter()

# Re‑use the same orchestrator instance as the run endpoint
orchestrator = OrchestratorAgent()


class ScheduleRequest(BaseModel):
    user_id: str = Field(..., description="User identifier for memory persistence")
    run_at: datetime = Field(..., description="When to execute the agent (ISO‑8601)")
    image: str | None = None
    posts: list | None = None
    intent: str | None = None
    profile: dict | None = None


async def _delayed_run(delay: float, payload: dict):
    """Sleep for *delay* seconds then invoke the orchestrator.
    The result is logged; in a real SaaS you would push a notification.
    """
    await asyncio.sleep(delay)
    await orchestrator.run(payload)
    # For now we just print – replace with push/notification as needed
    print(f"[Scheduled Agent] Executed for user {payload.get('user_id')}")


@router.post("/schedule", summary="Schedule a future agent run")
async def schedule_agent(request: ScheduleRequest, background: BackgroundTasks):
    now = datetime.now(timezone.utc)
    run_at = request.run_at.astimezone(timezone.utc)
    if run_at <= now:
        raise HTTPException(status_code=400, detail="run_at must be in the future")
    delay = (run_at - now).total_seconds()
    payload = request.dict(exclude={"run_at"})
    # Kick off background task
    background.add_task(_delayed_run, delay, payload)
    return {"status": "scheduled", "run_at": run_at.isoformat(), "delay_seconds": delay}
