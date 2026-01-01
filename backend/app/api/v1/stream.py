"""
Real-Time Streaming API Endpoints
Server-Sent Events (SSE) and WebSocket support for live agent interactions.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlmodel import Session
from app.db.session import get_session
from app.services.agent_service import CreatorAgent
from app.core.dependencies import CurrentUser, get_current_user_ws
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import json
import asyncio
import uuid

router = APIRouter()


# ========================================
# SSE STREAMING CHAT
# ========================================

class StreamChatRequest(BaseModel):
    """Request for streaming chat."""
    message: str
    conversation_id: Optional[str] = None
    page_context: Optional[Dict[str, Any]] = None


async def stream_agent_response(
    agent: CreatorAgent,
    message: str,
    conversation_id: Optional[uuid.UUID],
    page_context: Optional[Dict]
):
    """
    Generator that yields SSE-formatted tokens.
    Uses the agent's chat method and streams the response.
    """
    try:
        # Send start event
        yield f"event: start\ndata: {json.dumps({'status': 'started'})}\n\n"
        
        # Get the full response (we'll simulate streaming for now until model supports it)
        result = agent.chat(
            message=message,
            conversation_id=conversation_id,
            page_context=page_context
        )
        
        content = result.get("content", "")
        conversation_id_str = result.get("conversation_id", "")
        
        # Stream tokens word by word for natural typing effect
        words = content.split(' ')
        buffer = ""
        
        for i, word in enumerate(words):
            buffer += word + " "
            
            # Yield token event every few words for efficiency
            if i % 3 == 0 or i == len(words) - 1:
                yield f"event: token\ndata: {json.dumps({'token': buffer})}\n\n"
                buffer = ""
                await asyncio.sleep(0.02)  # Small delay for natural feel
        
        # Send complete event with full message
        yield f"event: complete\ndata: {json.dumps({'content': content, 'conversation_id': conversation_id_str})}\n\n"
        
    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"


@router.post("/chat")
async def stream_chat(
    request: StreamChatRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_session)
):
    """
    Stream a chat response using Server-Sent Events (SSE).
    
    The response is streamed as tokens for real-time display.
    Events:
    - start: Stream has begun
    - token: A chunk of the response
    - complete: Full response with metadata
    - error: An error occurred
    """
    agent = CreatorAgent(db=db, user_id=str(current_user.id))
    
    conversation_id = None
    if request.conversation_id:
        try:
            conversation_id = uuid.UUID(request.conversation_id)
        except ValueError:
            pass
    
    return StreamingResponse(
        stream_agent_response(agent, request.message, conversation_id, request.page_context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# ========================================
# WEBSOCKET CONNECTION MANAGER
# ========================================

class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""
    
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Connect a WebSocket for a user."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Disconnect a WebSocket."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
    
    async def send_personal(self, message: Dict, user_id: str):
        """Send message to all connections of a user."""
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass
    
    async def broadcast(self, message: Dict):
        """Broadcast to all connected users."""
        for user_id in self.active_connections:
            await self.send_personal(message, user_id)
    
    def get_connected_users(self) -> List[str]:
        """Get list of connected user IDs."""
        return list(self.active_connections.keys())


# Singleton connection manager
manager = ConnectionManager()


# ========================================
# WEBSOCKET ENDPOINT
# ========================================

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    db: Session = Depends(get_session)
):
    """
    WebSocket endpoint for real-time bidirectional communication.
    
    Message types:
    - ping: Health check, responds with pong
    - chat: Send message to agent, streams response
    - subscribe: Subscribe to notifications
    - status: Get current agent status
    """
    await manager.connect(websocket, user_id)
    
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to Creator OS real-time server",
            "user_id": user_id
        })
        
        while True:
            # Receive message
            data = await websocket.receive_json()
            msg_type = data.get("type", "")
            
            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": str(asyncio.get_event_loop().time())})
            
            elif msg_type == "chat":
                # Handle chat message
                message = data.get("message", "")
                conversation_id = data.get("conversation_id")
                
                if message:
                    agent = CreatorAgent(db=db, user_id=user_id)
                    
                    conv_uuid = None
                    if conversation_id:
                        try:
                            conv_uuid = uuid.UUID(conversation_id)
                        except ValueError:
                            pass
                    
                    # Send typing indicator
                    await websocket.send_json({"type": "typing", "status": True})
                    
                    try:
                        result = agent.chat(
                            message=message,
                            conversation_id=conv_uuid,
                            page_context=data.get("page_context")
                        )
                        
                        await websocket.send_json({
                            "type": "chat_response",
                            "content": result.get("content"),
                            "conversation_id": result.get("conversation_id"),
                            "message_id": result.get("message_id")
                        })
                    except Exception as e:
                        await websocket.send_json({
                            "type": "error",
                            "error": str(e)
                        })
                    finally:
                        await websocket.send_json({"type": "typing", "status": False})
            
            elif msg_type == "subscribe":
                # Subscribe to notification channels
                channels = data.get("channels", ["insights", "alerts"])
                await websocket.send_json({
                    "type": "subscribed",
                    "channels": channels
                })
            
            elif msg_type == "status":
                await websocket.send_json({
                    "type": "status",
                    "connected_users": len(manager.get_connected_users()),
                    "your_id": user_id
                })
            
            else:
                await websocket.send_json({
                    "type": "error",
                    "error": f"Unknown message type: {msg_type}"
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        manager.disconnect(websocket, user_id)
        print(f"WebSocket error for {user_id}: {e}")


# ========================================
# NOTIFICATION BROADCAST API
# ========================================

class NotificationRequest(BaseModel):
    """Request to send notification."""
    user_id: str
    notification_type: str
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None


@router.post("/notify")
async def send_notification(
    request: NotificationRequest,
    current_user: CurrentUser
):
    """
    Send a real-time notification to a user.
    Used by background tasks to push updates.
    """
    notification = {
        "type": "notification",
        "notification_type": request.notification_type,
        "title": request.title,
        "message": request.message,
        "data": request.data,
        "timestamp": str(asyncio.get_event_loop().time())
    }
    
    await manager.send_personal(notification, request.user_id)
    
    return {
        "status": "sent",
        "user_connected": request.user_id in manager.active_connections
    }


@router.get("/connections")
async def get_connections(current_user: CurrentUser):
    """Get count of active WebSocket connections."""
    return {
        "connected_users": len(manager.get_connected_users()),
        "user_ids": manager.get_connected_users()
    }
