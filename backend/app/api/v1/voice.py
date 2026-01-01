"""
Voice API Endpoint - Optimized for voice assistant interactions.
Provides fast, conversational responses suitable for TTS.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db.session import get_session
from app.services.agent_service import CreatorAgent
from app.core.dependencies import CurrentUser, OptionalUser
from pydantic import BaseModel
from typing import Optional, Dict, Any
import time

router = APIRouter()


class VoiceQueryRequest(BaseModel):
    """Request for voice query."""
    message: str
    voice_mode: bool = True
    conversation_id: Optional[str] = None
    language: str = "en-US"


class VoiceQueryResponse(BaseModel):
    """Response optimized for voice."""
    content: str
    short_content: str  # Shortened version for TTS
    conversation_id: Optional[str] = None
    latency_ms: int
    suggested_followups: list[str] = []


# Voice-specific system prompt suffix
VOICE_SYSTEM_PROMPT = """
When responding for voice:
- Keep responses BRIEF (1-3 sentences max)
- Use natural, conversational language
- Avoid bullet points, lists, or formatting
- Don't use emojis or special characters
- Be direct and actionable
- If data is complex, summarize the key insight
"""


def shorten_for_tts(text: str, max_words: int = 50) -> str:
    """Shorten text for TTS while keeping meaning."""
    # Remove markdown formatting
    text = text.replace('**', '').replace('*', '').replace('`', '')
    text = text.replace('#', '').replace('- ', '')
    
    # Split into sentences
    sentences = text.replace('!', '.').replace('?', '.').split('.')
    sentences = [s.strip() for s in sentences if s.strip()]
    
    # Take first few sentences up to word limit
    result = []
    word_count = 0
    
    for sentence in sentences:
        words = sentence.split()
        if word_count + len(words) <= max_words:
            result.append(sentence)
            word_count += len(words)
        else:
            break
    
    return '. '.join(result) + '.' if result else text[:200]


def generate_followups(query: str, response: str) -> list[str]:
    """Generate suggested follow-up questions."""
    # Simple keyword-based suggestions
    followups = []
    
    query_lower = query.lower()
    
    if any(w in query_lower for w in ['analytics', 'stats', 'performance']):
        followups.extend([
            "What was my best performing post?",
            "When should I post next?"
        ])
    
    if any(w in query_lower for w in ['content', 'post', 'idea']):
        followups.extend([
            "Give me more content ideas",
            "What's trending right now?"
        ])
    
    if any(w in query_lower for w in ['grow', 'growth', 'followers']):
        followups.extend([
            "How can I grow faster?",
            "What are my competitors doing?"
        ])
    
    if not followups:
        followups = [
            "Tell me more",
            "What else should I know?",
            "Any other suggestions?"
        ]
    
    return followups[:3]


@router.post("/query", response_model=VoiceQueryResponse)
async def voice_query(
    request: VoiceQueryRequest,
    current_user: OptionalUser,
    db: Session = Depends(get_session)
):
    """
    Process a voice query and return a voice-optimized response.
    
    Features:
    - Faster response with shorter context
    - TTS-friendly output formatting
    - Suggested follow-up questions
    - Latency tracking
    """
    start_time = time.time()
    
    # Get user ID or use anonymous
    user_id = str(current_user.id) if current_user else "anonymous"
    
    try:
        # Initialize agent with voice mode
        agent = CreatorAgent(db=db, user_id=user_id)
        
        # Append voice system prompt for shorter responses
        voice_prompt = f"{request.message}\n\n[Voice Mode: Respond briefly in 1-3 sentences]"
        
        # Get response
        result = agent.chat(
            message=voice_prompt,
            conversation_id=None,  # Fresh conversation for voice
            page_context=None
        )
        
        content = result.get("content", "I'm sorry, I couldn't process that request.")
        conversation_id = result.get("conversation_id")
        
        # Calculate latency
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Generate short version for TTS
        short_content = shorten_for_tts(content)
        
        # Generate follow-ups
        followups = generate_followups(request.message, content)
        
        return VoiceQueryResponse(
            content=content,
            short_content=short_content,
            conversation_id=conversation_id,
            latency_ms=latency_ms,
            suggested_followups=followups
        )
        
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Return a friendly error message for voice
        error_msg = "I'm having trouble processing that. Please try again."
        
        return VoiceQueryResponse(
            content=error_msg,
            short_content=error_msg,
            conversation_id=None,
            latency_ms=latency_ms,
            suggested_followups=["Try again", "Ask something else"]
        )


@router.get("/status")
async def voice_status():
    """Check if voice service is available."""
    return {
        "status": "available",
        "features": [
            "speech_recognition",
            "text_to_speech",
            "wake_word_detection",
            "multi_language"
        ],
        "wake_word": "hey creator"
    }
