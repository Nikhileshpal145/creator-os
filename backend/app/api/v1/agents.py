"""
Agent API Endpoints
Provides REST API access to the agentic system.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.agents.context import AgentContext
from app.agents.orchestrator import orchestrator
from app.agents.jarvis_agent import jarvis
from app.api.v1.auth import get_current_user
from app.models.user import User
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class PerceiveRequest(BaseModel):
    """Real-time perception request from extension."""
    image_base64: Optional[str] = None
    text: Optional[str] = None
    platform: Optional[str] = None
    url: Optional[str] = None


class JarvisRequest(BaseModel):
    """Conversational request to JARVIS."""
    query: str
    context: Optional[Dict[str, Any]] = None


class AnalyzeRequest(BaseModel):
    """Full analysis request."""
    image_base64: Optional[str] = None
    caption: Optional[str] = None
    platform: Optional[str] = "instagram"


@router.post("/perceive")
async def perceive(
    request: PerceiveRequest,
    user: User = Depends(get_current_user)
):
    """
    Real-time perception endpoint.
    Called by extension every few seconds when composer is active.
    
    Runs full agent orchestration and returns decision.
    """
    
    # Build context
    ctx = AgentContext(
        user_id=str(user.id),
        image_base64=request.image_base64,
        text=request.text,
        platform=request.platform,
        url=request.url,
        source="extension"
    )
    
    # Run orchestrator
    try:
        result = await orchestrator.run(ctx)
        return result
    except Exception as e:
        logger.error(f"Perception failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jarvis")
async def jarvis_chat(
    request: JarvisRequest,
    user: User = Depends(get_current_user)
):
    """
    Conversational JARVIS endpoint.
    Ask questions and get personalized AI responses.
    """
    
    try:
        result = await jarvis.respond(
            query=request.query,
            user_id=str(user.id),
            additional_context=request.context
        )
        return result
    except Exception as e:
        logger.error(f"JARVIS failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def full_analyze(
    request: AnalyzeRequest,
    user: User = Depends(get_current_user)
):
    """
    Full post analysis with JARVIS response.
    Returns both technical analysis and conversational summary.
    """
    
    ctx = AgentContext(
        user_id=str(user.id),
        image_base64=request.image_base64,
        text=request.caption,
        platform=request.platform,
        source="api"
    )
    
    try:
        result = await jarvis.analyze_and_respond(
            query="Analyze this post for me",
            ctx=ctx
        )
        return result
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def agent_status(user: User = Depends(get_current_user)):
    """
    Get agent system status and user's memory patterns.
    """
    
    from app.agents.memory import agent_memory
    
    patterns = agent_memory.get_patterns(str(user.id))
    
    return {
        "status": "online",
        "agents": [
            "VisionAgent",
            "ContentAgent", 
            "AnalyticsAgent",
            "StrategyAgent",
            "JarvisAgent"
        ],
        "user_patterns": patterns
    }


@router.post("/quick")
async def quick_analyze(
    request: AnalyzeRequest,
    user: User = Depends(get_current_user)
):
    """
    Quick analysis without full history lookup.
    Faster for real-time feedback during typing/editing.
    """
    
    ctx = AgentContext(
        user_id=str(user.id),
        image_base64=request.image_base64,
        text=request.caption,
        platform=request.platform,
        source="api"
    )
    
    try:
        result = await orchestrator.quick_analyze(ctx)
        return result
    except Exception as e:
        logger.error(f"Quick analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
