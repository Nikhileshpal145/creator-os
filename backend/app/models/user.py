from .base import TimestampModel
from sqlmodel import Field
from typing import Optional
from datetime import datetime

class User(TimestampModel, table=True):
    """Enterprise User model with profile and subscription."""
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    
    # Business profile
    business_name: str | None = None
    niche: str | None = Field(default=None, description="Content niche e.g. Tech, Lifestyle")
    
    # Profile enhancements
    avatar_url: str | None = None
    bio: str | None = None
    website: str | None = None
    
    # Preferences
    timezone: str = Field(default="UTC")
    preferred_language: str = Field(default="en")
    
    # Onboarding
    onboarding_completed: bool = Field(default=False)
    onboarding_step: int = Field(default=0)
    
    # Subscription tier
    tier: str = Field(default="free")  # free, pro, enterprise
    tier_expires_at: Optional[datetime] = None
    
    # Account status
    is_active: bool = True
    email_verified: bool = False
    last_login_at: Optional[datetime] = None
    
    # Connected platforms count
    connected_platforms: int = Field(default=0)

