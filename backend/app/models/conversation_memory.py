"""
Conversation Memory Model
Stores chat history and context for the AI Agent.
"""
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON, Text
from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid


class Conversation(SQLModel, table=True):
    """A conversation thread with the AI agent."""
    __tablename__ = "conversations"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str = Field(index=True)
    
    # Auto-generated from first message
    title: str = Field(default="New Conversation")
    
    # Conversation metadata
    platform_context: Optional[str] = None  # youtube, instagram, linkedin, general
    page_url: Optional[str] = None  # URL when conversation started
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_message_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Status
    is_archived: bool = Field(default=False)
    message_count: int = Field(default=0)


class Message(SQLModel, table=True):
    """A single message in a conversation."""
    __tablename__ = "messages"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    conversation_id: uuid.UUID = Field(foreign_key="conversations.id", index=True)
    
    # Message content
    role: str = Field(index=True)  # user, assistant, tool, system
    content: str = Field(sa_column=Column(Text))
    
    # For tool calls
    tool_name: Optional[str] = None
    tool_call_id: Optional[str] = None
    tool_arguments: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    tool_result: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    # Metadata
    tokens_used: Optional[int] = None
    latency_ms: Optional[int] = None
    
    # Timestamp
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AgentContext(SQLModel, table=True):
    """Stores injected context for agent sessions (current page, scraped data, etc.)"""
    __tablename__ = "agent_contexts"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str = Field(index=True)
    conversation_id: Optional[uuid.UUID] = Field(default=None, foreign_key="conversations.id")
    
    # Context type
    context_type: str  # page_context, analytics_snapshot, user_profile
    
    # Flexible storage
    context_data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    
    # TTL
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ===== Pydantic Models for API =====

class MessageCreate(SQLModel):
    """Request to create a new message."""
    content: str
    conversation_id: Optional[uuid.UUID] = None
    page_context: Optional[Dict[str, Any]] = None


class MessageResponse(SQLModel):
    """Response from the agent."""
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    created_at: datetime


class ConversationSummary(SQLModel):
    """Summary of a conversation for listing."""
    id: uuid.UUID
    title: str
    platform_context: Optional[str]
    message_count: int
    last_message_at: datetime
    preview: Optional[str] = None  # First few chars of last message
