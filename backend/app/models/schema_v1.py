from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, Dict
from datetime import datetime
import uuid
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB

# 1. USER & AUTH
class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    full_name: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    drafts: List["ContentDraft"] = Relationship(back_populates="user")

# 2. CONTENT DRAFT (The Core Unit)
class ContentDraft(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    # Foreign Key to User
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    user: Optional[User] = Relationship(back_populates="drafts")
    
    # Content Data
    platform: str = Field(index=True) # twitter, linkedin
    original_text: str
    image_url: Optional[str] = None
    
    # AI Results (Stored as JSONB for flexibility)
    ai_status: str = Field(default="pending") # pending, processing, complete, failed
    ai_data: Dict = Field(default={}, sa_column=Column(JSONB))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    analytics: List["ContentMetric"] = Relationship(back_populates="draft")

# 3. CONTENT METRICS (Time-Series Data)
class ContentMetric(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    # Link to specific post draft
    draft_id: uuid.UUID = Field(foreign_key="contentdraft.id", index=True)
    draft: Optional[ContentDraft] = Relationship(back_populates="analytics")
    
    # The Stats
    views: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    ctr: float = 0.0
    
    # When did we capture this?
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
