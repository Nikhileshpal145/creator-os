from sqlmodel import SQLModel, Field
from typing import Dict, Optional
from datetime import datetime
import uuid
from sqlalchemy import Column
from sqlalchemy.types import JSON
from sqlalchemy.dialects.postgresql import JSONB


class StrategyAction(SQLModel, table=True):
    """
    Tracks recommended actions and their outcomes for the feedback loop.
    This enables learning from what actions users take and how they perform.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str = Field(index=True)
    
    # Action Details
    action_type: str = Field(index=True)  # post_content, change_timing, switch_platform, repeat_post
    title: str                             # "Post a thread on Twitter at 8 PM"
    description: str                       # Detailed recommendation
    
    # State Machine
    status: str = Field(default="pending")  # pending, taken, skipped, expired
    
    # Prediction before action
    predicted_impact: str = Field(default="")  # "+50% engagement"
    predicted_views: int = Field(default=0)
    predicted_engagement: int = Field(default=0)
    prediction_confidence: float = Field(default=0.0)  # 0-1
    
    # Actual outcome (filled after action is taken)
    actual_outcome: Dict = Field(default={}, sa_column=Column(JSON().with_variant(JSONB, "postgresql")))
    # Structure: {"views": 1200, "likes": 85, "comments": 12, "shares": 8}
    
    # Timing
    recommended_time: Optional[datetime] = None  # When to take the action
    taken_at: Optional[datetime] = None          # When action was actually taken
    outcome_recorded_at: Optional[datetime] = None
    
    # Priority and category
    priority: int = Field(default=2)  # 1=high, 2=medium, 3=low
    category: str = Field(default="content")  # content, timing, platform, engagement
    
    # Link to related pattern
    pattern_id: Optional[uuid.UUID] = Field(default=None, foreign_key="contentpattern.id")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None  # When the recommendation expires


class ContentPrediction(SQLModel, table=True):
    """
    Stores predictions for content before it's posted.
    Used to compare predicted vs actual performance.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str = Field(index=True)
    
    # Content being predicted
    content_preview: str = Field(default="")  # First 200 chars
    platform: str = Field(index=True)
    planned_post_time: Optional[datetime] = None
    
    # Predictions
    predicted_views: int = Field(default=0)
    predicted_likes: int = Field(default=0)
    predicted_comments: int = Field(default=0)
    predicted_shares: int = Field(default=0)
    predicted_engagement_rate: float = Field(default=0.0)
    
    # Factors used for prediction
    prediction_factors: Dict = Field(default={}, sa_column=Column(JSON().with_variant(JSONB, "postgresql")))
    # Example: {"has_face": true, "is_peak_hour": true, "content_type": "thread"}
    
    # Confidence and accuracy
    confidence_score: float = Field(default=0.0)  # 0-1
    
    # Actual (filled after posting)
    actual_views: Optional[int] = None
    actual_likes: Optional[int] = None
    actual_comments: Optional[int] = None
    actual_shares: Optional[int] = None
    prediction_accuracy: Optional[float] = None  # How close was the prediction
    
    # Status
    status: str = Field(default="predicted")  # predicted, posted, measured
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    posted_at: Optional[datetime] = None
    measured_at: Optional[datetime] = None


class WeeklyStrategy(SQLModel, table=True):
    """
    Weekly strategy summary for the user.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str = Field(index=True)
    
    # Week info
    week_start: datetime
    week_end: datetime
    
    # Goals
    target_posts: int = Field(default=5)
    target_engagement: int = Field(default=0)
    
    # Progress
    posts_completed: int = Field(default=0)
    engagement_achieved: int = Field(default=0)
    actions_taken: int = Field(default=0)
    actions_skipped: int = Field(default=0)
    
    # Learning metrics
    prediction_accuracy_avg: float = Field(default=0.0)
    best_performing_day: Optional[str] = None
    best_performing_platform: Optional[str] = None
    
    # Summary (generated)
    summary: str = Field(default="")
    insights: Dict = Field(default={}, sa_column=Column(JSON().with_variant(JSONB, "postgresql")))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
