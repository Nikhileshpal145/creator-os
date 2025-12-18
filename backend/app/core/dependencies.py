"""
Core Authentication Dependencies
Provides centralized auth utilities for all protected endpoints.
"""
from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlmodel import Session, select
from datetime import datetime

from app.core.config import settings
from app.db.session import get_session
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)


class AuthError(HTTPException):
    """Authentication error with details."""
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )


def decode_token(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError as e:
        raise AuthError(f"Invalid token: {str(e)}")


async def get_current_user(
    token: Annotated[Optional[str], Depends(oauth2_scheme)],
    db: Session = Depends(get_session)
) -> User:
    """
    Get authenticated user from JWT token.
    Use as dependency in protected endpoints.
    """
    if not token:
        raise AuthError("Authentication required")
    
    payload = decode_token(token)
    
    email: str = payload.get("sub")
    if not email:
        raise AuthError("Invalid token payload")
    
    # Check token expiration
    exp = payload.get("exp")
    if exp and datetime.utcnow().timestamp() > exp:
        raise AuthError("Token has expired")
    
    # Fetch user from database
    statement = select(User).where(User.email == email)
    user = db.exec(statement).first()
    
    if not user:
        raise AuthError("User not found")
    
    if not user.is_active:
        raise AuthError("User account is disabled")
    
    return user


async def get_current_user_optional(
    token: Annotated[Optional[str], Depends(oauth2_scheme)],
    db: Session = Depends(get_session)
) -> Optional[User]:
    """
    Get authenticated user if token provided, otherwise return None.
    Use for endpoints that work with or without auth.
    """
    if not token:
        return None
    
    try:
        return await get_current_user(token, db)
    except AuthError:
        return None


def get_user_from_header(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_session)
) -> Optional[User]:
    """
    Extract user from Authorization header.
    Alternative to OAuth2 scheme for more flexibility.
    """
    if not authorization:
        return None
    
    if not authorization.startswith("Bearer "):
        return None
    
    token = authorization[7:]  # Remove "Bearer " prefix
    
    try:
        payload = decode_token(token)
        email = payload.get("sub")
        if not email:
            return None
        
        statement = select(User).where(User.email == email)
        user = db.exec(statement).first()
        return user
    except Exception:
        return None


# Type aliases for cleaner endpoint signatures
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[Optional[User], Depends(get_current_user_optional)]


def require_tier(required_tier: str):
    """
    Dependency that checks user's subscription tier.
    Usage: Depends(require_tier("pro"))
    """
    async def check_tier(user: CurrentUser) -> User:
        tier_hierarchy = {"free": 0, "pro": 1, "enterprise": 2}
        user_level = tier_hierarchy.get(user.tier, 0)
        required_level = tier_hierarchy.get(required_tier, 0)
        
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires {required_tier} tier or higher"
            )
        return user
    
    return check_tier
