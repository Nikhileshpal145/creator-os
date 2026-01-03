# backend/app/api/v1/agent.py
"""FastAPI router exposing the native agent system.
Provides endpoints to run the orchestrator pipeline and a chat interface.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from app.agents.orchestrator import OrchestratorAgent

router = APIRouter()

# Singleton orchestrator instance for the application lifetime
orchestrator = OrchestratorAgent()


class AgentRunRequest(BaseModel):
    user_id: Optional[str] = Field("default_user", description="User ID for memory")
    image: Optional[str] = Field(None, description="Base64 or URL of an image for VisionAgent")
    posts: Optional[List[Dict[str, Any]]] = Field(
        None, description="List of post objects (text, metrics, etc.)"
    )
    intent: Optional[str] = Field(None, description="User intent string, e.g. 'growth_advice'")
    profile: Optional[Dict[str, Any]] = Field(None, description="Optional user profile data")


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    page_context: Optional[Dict[str, Any]] = None
    image: Optional[str] = None
    text: Optional[str] = None


@router.post("/run", summary="Run the native Jarvis agent pipeline")
async def run_agent(payload: AgentRunRequest):
    # Build the context dict that agents will read/write
    ctx: Dict[str, Any] = payload.dict(exclude_none=True)
    # Ensure a user_id is present for memory handling
    ctx.setdefault("user_id", "default_user")
    try:
        decision = await orchestrator.run(ctx)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    # Return the decision; additional details can be added later if needed
    return {"result": decision, "details": {}}


@router.post("/chat", summary="Chat interface for the Extension")
async def chat_agent(payload: ChatRequest):
    """Adapter endpoint for the Chrome Extension.
    Maps the incoming message to an intent and runs the orchestrator.
    """
    ctx = {
        "user_id": "extension_user",
        "intent": payload.message,
        "page_context": payload.page_context,
        "profile": {"platform": payload.page_context.get("platform") if payload.page_context else "unknown"},
        "image": payload.image,
        "text": payload.text
    }
    try:
        decision = await orchestrator.run(ctx)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    # decision is a dict from StrategyAgent.decide, e.g. {"advice": "..."}
    # We need to return a string for the frontend 'content' field.
    if isinstance(decision, dict):
        final_answer = decision.get("advice") or decision.get("suggestion") or str(decision)
    else:
        final_answer = str(decision)
    
    if not final_answer:
        final_answer = "I'm thinking..."
    return {
        "content": final_answer,
        "conversation_id": payload.conversation_id or "new_conv_id",
        "agent_details": {},
    }


@router.get("/suggested-questions", summary="Get suggested questions for the user")
async def get_suggested_questions(platform: Optional[str] = None):
    """Return context‑aware suggestion prompts for the extension.
    """
    base_questions = [
        "How can I grow my following?",
        "What is my best performing content?",
        "Analyze my posting schedule",
    ]
    if platform == "youtube":
        return {"suggested_questions": ["Analyze my thumbnail CTR", "Video topic ideas"] + base_questions}
    elif platform == "linkedin":
        return {"suggested_questions": ["Improve my profile headline", "Post hook ideas"] + base_questions}
    elif platform == "instagram":
        return {"suggested_questions": ["Reels vs Feed analysis", "Caption generator"] + base_questions}
    return {"suggested_questions": base_questions}
