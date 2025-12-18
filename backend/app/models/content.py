from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, Dict, List
from datetime import datetime
import uuid
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB

class ContentPerformance(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    draft_id: uuid.UUID = Field(foreign_key="contentdraft.id", index=True)
    
    # Metrics
    views: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    
    # When did we capture this data?
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Link back to parent
    draft: "ContentDraft" = Relationship(back_populates="performance_history")

class ContentDraft(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str
    text_content: str
    platform: str
    status: str = "pending" # pending, processing, completed
    
    # Store AI Analysis as JSON
    # Pydantic doesn't validate JSONB contents by default, so we treat it as Dict
    ai_analysis: Dict = Field(default={}, sa_column=Column(JSONB))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Link to analytics
    posted_url: Optional[str] = None # We need to know where it was posted
    performance_history: List["ContentPerformance"] = Relationship(back_populates="draft")
