# backend/app/api/v1/perception.py
"""API endpoint for real‑time perception from the Chrome extension.
Accepts an image (base64) and optional text, builds an AgentContext,
runs the orchestrator pipeline, and returns the final decision.
"""

from fastapi import APIRouter, HTTPException
from typing import Any, Dict

from app.agents.orchestrator import OrchestratorAgent

router = APIRouter()

# Singleton orchestrator instance
orchestrator = OrchestratorAgent()

@router.post("/perceive", summary="Real‑time perception endpoint")
async def perceive_endpoint(data: Dict[str, Any]):
    # Expected keys: image (base64), text, platform, user_id (optional), intent (optional)
    ctx = {
        "user_id": data.get("user_id", "default_user"),
        "image": data.get("image"),
        "text": data.get("text"),
        "platform": data.get("platform"),
        "intent": data.get("intent"),
    }
    # Remove None values
    ctx = {k: v for k, v in ctx.items() if v is not None}
    try:
        decision = await orchestrator.run(ctx)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"result": decision, "details": ctx}
