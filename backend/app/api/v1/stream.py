from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session
from app.db.session import get_session
from app.core.dependencies import CurrentUser
from pydantic import BaseModel
import json
import asyncio

router = APIRouter()

class StreamAnalyzeRequest(BaseModel):
    profile_data: dict

@router.post("/profile")
async def stream_profile_analysis(
    request: StreamAnalyzeRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_session)
):
    """
    Streamed profile analysis.
    Provides real-time insights as they are generated.
    """
    async def analysis_generator():
        data = request.profile_data
        name = data.get("name", "Unknown")
        
        yield f"data: {json.dumps({'status': 'starting', 'message': f'Analyzing profile for {name}...'})}\n\n"
        await asyncio.sleep(0.5)
        
        # 1. Headline Analysis
        headline = data.get("headline", "")
        if len(headline) < 10:
            insight = "⚠️ Headline is too short. Add keywords like 'Founder', 'Engineer'."
        elif "help" in headline.lower() or "scale" in headline.lower():
            insight = "✅ Great 'benefit-driven' headline."
        else:
            insight = "💡 Suggestion: Make your headline more outcome-focused."
        
        yield f"data: {json.dumps({'status': 'insight', 'type': 'headline', 'content': insight})}\n\n"
        await asyncio.sleep(0.8)
        
        # 2. Content Analysis
        posts = data.get("posts", [])
        if not posts:
            insight = "⚠️ No recent posts detected. Consistency is key!"
        else:
            insight = f"✅ Found {len(posts)} recent posts. Good activity."
            
        yield f"data: {json.dumps({'status': 'insight', 'type': 'consistency', 'content': insight})}\n\n"
        await asyncio.sleep(0.5)
        
        # 3. Final Summary
        yield f"data: {json.dumps({'status': 'complete', 'insights_count': 2, 'market_trends': ['AI Agents', 'Personal Branding']})}\n\n"

    return StreamingResponse(analysis_generator(), media_type="text/event-stream")

# New streaming chat endpoint

from app.services.agent_service import CreatorAgent
from pydantic import BaseModel
import json

class StreamChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    page_context: dict | None = None

@router.post("/chat")
async def stream_chat(request: StreamChatRequest, current_user: CurrentUser, db: Session = Depends(get_session)):
    """Stream chat responses for the extension UI.
    Returns a Server‑Sent Events (SSE) stream with a single JSON payload.
    """
    async def generator():
        try:
            agent = CreatorAgent(db, str(current_user.id))
            resp = await agent.chat(request.message, request.conversation_id, request.page_context)
            # Ensure the response is JSON‑serialisable
            yield f"data: {json.dumps(resp)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({{'error': str(e)}})}\n\n"
    return StreamingResponse(generator(), media_type="text/event-stream")
