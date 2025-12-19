"""
ScrapedWebPage Model
Stores scraped data from any website the user visits.
"""
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSON


class ScrapedWebPage(SQLModel, table=True):
    """
    Universal web page scraping storage.
    Stores data from any website the user visits with the extension active.
    """
    __tablename__ = "scraped_web_page"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str = Field(index=True)
    
    # Page identification
    url: str = Field(max_length=2048)
    domain: str = Field(max_length=255, index=True)  # e.g., "linkedin.com"
    path: Optional[str] = Field(max_length=1024, default=None)  # e.g., "/in/johndoe"
    
    # Page type detection
    page_type: str = Field(max_length=50, default="unknown")  # social, blog, ecommerce, news, profile, video, etc.
    platform: Optional[str] = Field(max_length=50, default=None)  # linkedin, youtube, twitter, etc.
    
    # Content
    title: str = Field(max_length=500, default="")
    description: Optional[str] = Field(max_length=2000, default=None)
    
    # Flexible JSON storage for scraped content
    scraped_content: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    
    # Detected metrics/numbers on the page
    detected_metrics: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    
    # Timestamps
    scraped_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        arbitrary_types_allowed = True
