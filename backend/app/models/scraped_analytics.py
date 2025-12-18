"""
Scraped Analytics Model
Stores analytics data scraped via browser extension from YouTube Studio, Instagram Insights, etc.
"""
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON
from datetime import datetime
from typing import Optional, Dict, Any
import uuid


class ScrapedAnalytics(SQLModel, table=True):
    """
    Stores platform analytics scraped by the browser extension.
    This is used when OAuth is not available/desired.
    """
    __tablename__ = "scraped_analytics"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str = Field(index=True)
    platform: str = Field(index=True)  # youtube, instagram, linkedin, twitter
    
    # Core metrics (nullable as not all platforms have all)
    views: Optional[int] = None
    followers: Optional[int] = None
    subscribers: Optional[int] = None
    watch_time_minutes: Optional[float] = None
    engagement_rate: Optional[float] = None
    
    # Flexible storage for platform-specific metrics
    raw_metrics: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    
    # Source URL where data was scraped from
    source_url: Optional[str] = None
    
    # Timestamps
    scraped_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ScrapedAnalyticsSummary(SQLModel):
    """Summary view for dashboard display."""
    platform: str
    latest_views: int
    latest_followers: int
    total_records: int
    last_synced: datetime
