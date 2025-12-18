from sqlmodel import SQLModel, Field
from typing import Dict, Optional
from datetime import datetime
import uuid
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB


class ContentPattern(SQLModel, table=True):
    """
    Stores detected patterns in content performance.
    Used by the Intelligence Layer for pattern detection and causal explanations.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str = Field(index=True)
    
    # Pattern Classification
    pattern_type: str = Field(index=True)  # content_type, posting_time, caption_structure, engagement_velocity
    platform: str = Field(default="all")   # twitter, linkedin, youtube, instagram, or 'all' for cross-platform
    
    # Pattern Data (flexible JSONB for different pattern types)
    # Examples:
    # - content_type: {"type": "reel_with_face", "avg_engagement": 450, "comparison_avg": 195}
    # - posting_time: {"optimal_hours": [20, 21], "optimal_days": ["tuesday", "thursday"]}
    # - caption_structure: {"style": "short", "max_chars": 150, "uses_emoji": true}
    # - engagement_velocity: {"first_hour_likes": 50, "correlation_score": 0.85}
    pattern_data: Dict = Field(default={}, sa_column=Column(JSONB))
    
    # Statistical Confidence
    confidence_score: float = Field(default=0.0)  # 0.0 to 1.0
    sample_size: int = Field(default=0)           # Number of posts analyzed
    analysis_window_days: int = Field(default=60) # How many days of data analyzed
    
    # Performance Impact
    performance_multiplier: float = Field(default=1.0)  # e.g., 2.3 means "2.3× better"
    
    # Causal Explanation (human-readable)
    explanation: str = Field(default="")  # e.g., "Reels with faces perform 2.3× better"
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PatternRecommendation(SQLModel, table=True):
    """
    Actionable recommendations derived from detected patterns.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str = Field(index=True)
    
    # Recommendation Details
    title: str                              # Brief title
    description: str                        # Detailed recommendation
    priority: int = Field(default=1)        # 1 = high, 2 = medium, 3 = low
    category: str = Field(default="general")  # timing, content, engagement, growth
    
    # Link to source pattern
    pattern_id: Optional[uuid.UUID] = Field(default=None, foreign_key="contentpattern.id")
    
    # Impact prediction
    expected_impact: str = Field(default="")  # e.g., "+40% engagement"
    
    # Status tracking
    is_active: bool = Field(default=True)
    is_dismissed: bool = Field(default=False)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
