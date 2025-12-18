from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from app.db.session import get_session
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter()

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    business_name: Optional[str] = None
    niche: Optional[str] = None

@router.get("/me")
async def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    """
    Returns the current authenticated user.
    """
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "display_name": current_user.full_name,
        "business_name": current_user.business_name,
        "niche": current_user.niche,
        "avatar_initials": current_user.full_name[:2].upper() if current_user.full_name else "??"
    }

@router.put("/profile")
async def update_profile(
    settings: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_session)
):
    """
    Updates the current user's profile.
    """
    if settings.display_name:
        current_user.full_name = settings.display_name
    if settings.business_name:
        current_user.business_name = settings.business_name
    if settings.niche:
        current_user.niche = settings.niche
        
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    return current_user
