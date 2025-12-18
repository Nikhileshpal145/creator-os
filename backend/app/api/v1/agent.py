"""
AI Agent API Endpoints
Handles chat, conversations, and context injection.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db.session import get_session
from app.services.agent_service import CreatorAgent
from app.models.conversation_memory import Conversation
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uuid

from app.core.dependencies import CurrentUser

router = APIRouter()


class ChatRequest(BaseModel):
    """Request to send a chat message."""
    message: str
    conversation_id: Optional[str] = None
    page_context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    """Response from the agent."""
    message_id: str
    conversation_id: str
    content: str
    latency_ms: int


class ContextRequest(BaseModel):
    """Request to inject page context."""
    url: str
    title: Optional[str] = None
    platform: Optional[str] = None
    visible_metrics: Optional[Dict[str, Any]] = None
    screenshot_base64: Optional[str] = None


@router.post("/chat", response_model=ChatResponse)
def chat_with_agent(
    request: ChatRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_session)
):
    """
    Send a message to the AI agent and get a response.
    
    The agent will:
    1. Load conversation history if conversation_id is provided
    2. Use page_context to understand what the user is looking at
    3. Call tools to fetch real analytics data
    4. Return a helpful, data-driven response
    """
    try:
        agent = CreatorAgent(db=db, user_id=str(current_user.id))
        
        conversation_id = None
        if request.conversation_id:
            try:
                conversation_id = uuid.UUID(request.conversation_id)
            except ValueError:
                pass
        
        result = agent.chat(
            message=request.message,
            conversation_id=conversation_id,
            page_context=request.page_context
        )
        
        return ChatResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@router.get("/conversations")
def list_conversations(
    user_id: str = "nikhilesh",
    limit: int = 20,
    db: Session = Depends(get_session)
):
    """List user's conversation history."""
    
    agent = CreatorAgent(db=db, user_id=user_id)
    conversations = agent.get_conversations(limit=limit)
    
    return {"conversations": conversations}


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: str,
    user_id: str = "nikhilesh",
    db: Session = Depends(get_session)
):
    """Get full conversation with all messages."""
    
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    # Verify ownership
    conversation = db.get(Conversation, conv_uuid)
    if not conversation or conversation.user_id != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    agent = CreatorAgent(db=db, user_id=user_id)
    messages = agent.get_conversation_messages(conv_uuid)
    
    return {
        "conversation": {
            "id": str(conversation.id),
            "title": conversation.title,
            "platform_context": conversation.platform_context,
            "created_at": conversation.created_at.isoformat(),
            "message_count": conversation.message_count
        },
        "messages": messages
    }


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    user_id: str = "nikhilesh",
    db: Session = Depends(get_session)
):
    """Archive a conversation."""
    
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    conversation = db.get(Conversation, conv_uuid)
    if not conversation or conversation.user_id != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation.is_archived = True
    db.add(conversation)
    db.commit()
    
    return {"status": "archived", "conversation_id": conversation_id}


@router.post("/context")
def inject_context(
    request: ContextRequest,
    user_id: str = "nikhilesh",
    db: Session = Depends(get_session)
):
    """
    Inject current page context for the agent.
    Called by the extension when the user opens the chat.
    """
    
    from app.models.conversation_memory import AgentContext
    from datetime import datetime, timedelta
    
    # Create context record
    context = AgentContext(
        user_id=user_id,
        context_type="page_context",
        context_data={
            "url": request.url,
            "title": request.title,
            "platform": request.platform,
            "visible_metrics": request.visible_metrics,
            "has_screenshot": bool(request.screenshot_base64)
        },
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    
    db.add(context)
    db.commit()
    db.refresh(context)
    
    return {
        "status": "context_injected",
        "context_id": str(context.id),
        "platform_detected": request.platform
    }


@router.get("/suggested-questions")
def get_suggested_questions(
    platform: Optional[str] = None,
    user_id: str = "nikhilesh"
):
    """Get suggested questions based on context."""
    
    general_questions = [
        "How am I performing overall?",
        "What content works best for me?",
        "Why did my engagement change recently?",
        "What should I post next?",
        "When is the best time to post?"
    ]
    
    platform_questions = {
        "youtube": [
            "How's my channel doing?",
            "Which videos should I make more of?",
            "What's my subscriber trend?",
            "How can I improve my watch time?"
        ],
        "instagram": [
            "How's my reach this week?",
            "Which reels performed best?",
            "How can I grow my followers?",
            "What hashtags should I use?"
        ],
        "linkedin": [
            "How's my LinkedIn engagement?",
            "Which posts should I repurpose?",
            "Am I posting at the right times?",
            "How do I get more impressions?"
        ]
    }
    
    questions = general_questions
    if platform and platform.lower() in platform_questions:
        questions = platform_questions[platform.lower()] + general_questions[:2]
    
    return {"suggested_questions": questions}


# ===== AUTOMATION ENDPOINTS =====

class AutomationRequest(BaseModel):
    """Request to parse automation command."""
    command: str
    current_url: Optional[str] = None


@router.post("/automate")
def parse_automation_command(request: AutomationRequest):
    """
    Parse natural language into browser automation actions.
    
    Examples:
    - "Click the subscribe button"
    - "Go to YouTube Studio and click Analytics"
    - "Scroll down and click the first video"
    """
    from app.services.automation_service import automation_parser
    
    result = automation_parser.parse_command(request.command)
    
    return {
        "success": result.success,
        "actions": [a.dict() for a in result.actions],
        "requires_confirmation": result.requires_confirmation,
        "sensitive_reason": result.sensitive_reason,
        "action_count": len(result.actions)
    }


@router.post("/automate/validate")
def validate_automation_actions(actions: List[Dict[str, Any]]):
    """
    Validate a list of automation actions before execution.
    Checks for sensitive actions and security concerns.
    """
    from app.services.automation_service import SENSITIVE_PATTERNS
    import re
    
    validated_actions = []
    has_sensitive = False
    sensitive_reasons = []
    
    for action in actions:
        is_sensitive = False
        
        # Check action content for sensitive patterns
        action_text = f"{action.get('target', '')} {action.get('value', '')} {action.get('url', '')}".lower()
        
        for pattern, reason in SENSITIVE_PATTERNS:
            if re.search(pattern, action_text):
                is_sensitive = True
                has_sensitive = True
                if reason not in sensitive_reasons:
                    sensitive_reasons.append(reason)
                break
        
        validated_actions.append({
            **action,
            "is_sensitive": is_sensitive
        })
    
    return {
        "actions": validated_actions,
        "has_sensitive_actions": has_sensitive,
        "sensitive_reasons": sensitive_reasons,
        "can_auto_execute": not has_sensitive
    }

