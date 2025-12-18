"""
OAuth Endpoints for Social Platform Connections

Handles OAuth 2.0 flow for:
- YouTube (Google)
- Instagram (Meta)
- LinkedIn
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel import Session
from app.db.session import get_session
from app.models.social_account import save_social_account, SocialAccount
from datetime import datetime, timedelta
import httpx
import os

router = APIRouter()


# ========================================
# OAUTH CONFIGURATION
# ========================================

class OAuthConfig:
    """OAuth configuration for each platform."""
    
    GOOGLE = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "scopes": [
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/yt-analytics.readonly",
            "openid",
            "email",
            "profile"
        ]
    }
    
    META = {
        "client_id": os.getenv("META_CLIENT_ID", ""),
        "client_secret": os.getenv("META_CLIENT_SECRET", ""),
        "auth_url": "https://www.facebook.com/v18.0/dialog/oauth",
        "token_url": "https://graph.facebook.com/v18.0/oauth/access_token",
        "scopes": [
            "instagram_basic",
            "instagram_content_publish",
            "pages_show_list",
            "pages_read_engagement"
        ]
    }
    
    LINKEDIN = {
        "client_id": os.getenv("LINKEDIN_CLIENT_ID", ""),
        "client_secret": os.getenv("LINKEDIN_CLIENT_SECRET", ""),
        "auth_url": "https://www.linkedin.com/oauth/v2/authorization",
        "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
        "scopes": ["r_liteprofile", "r_emailaddress", "w_member_social"]
    }


def get_redirect_uri(platform: str) -> str:
    """Get OAuth callback URL."""
    base_url = os.getenv("APP_BASE_URL", "http://localhost:8000")
    return f"{base_url}/auth/{platform}/callback"


# ========================================
# YOUTUBE (GOOGLE) OAUTH
# ========================================

@router.get("/youtube/connect")
async def connect_youtube(user_id: str):
    """
    Initiate YouTube OAuth flow.
    Redirects user to Google consent screen.
    """
    config = OAuthConfig.GOOGLE
    
    if not config["client_id"]:
        raise HTTPException(
            status_code=400, 
            detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )
    
    params = {
        "client_id": config["client_id"],
        "redirect_uri": get_redirect_uri("youtube"),
        "response_type": "code",
        "scope": " ".join(config["scopes"]),
        "access_type": "offline",
        "prompt": "consent",
        "state": user_id  # Pass user_id through state
    }
    
    url = f"{config['auth_url']}?" + "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(url)


@router.get("/youtube/callback")
async def youtube_callback(
    code: str = None,
    state: str = None,  # user_id
    error: str = None,
    db: Session = Depends(get_session)
):
    """
    Handle YouTube OAuth callback.
    Exchange code for tokens and save to database.
    """
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")
    
    user_id = state
    config = OAuthConfig.GOOGLE
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        response = await client.post(
            config["token_url"],
            data={
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": get_redirect_uri("youtube")
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")
        
        tokens = response.json()
    
    # Get user info
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        user_info = response.json() if response.status_code == 200 else {}
    
    # Calculate expiry
    expires_at = None
    if "expires_in" in tokens:
        expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
    
    # Save to database
    _ = save_social_account(
        db=db,
        user_id=user_id,
        platform="youtube",
        access_token=tokens["access_token"],
        refresh_token=tokens.get("refresh_token"),
        expires_at=expires_at,
        account_name=user_info.get("name"),
        account_email=user_info.get("email"),
        profile_picture=user_info.get("picture"),
        scope=" ".join(config["scopes"])
    )
    
    # Redirect back to dashboard
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(f"{frontend_url}/settings?connected=youtube")


# ========================================
# INSTAGRAM (META) OAUTH
# ========================================

@router.get("/instagram/connect")
async def connect_instagram(user_id: str):
    """
    Initiate Instagram OAuth flow.
    """
    config = OAuthConfig.META
    
    if not config["client_id"]:
        raise HTTPException(
            status_code=400,
            detail="Meta OAuth not configured. Set META_CLIENT_ID and META_CLIENT_SECRET."
        )
    
    params = {
        "client_id": config["client_id"],
        "redirect_uri": get_redirect_uri("instagram"),
        "response_type": "code",
        "scope": ",".join(config["scopes"]),
        "state": user_id
    }
    
    url = f"{config['auth_url']}?" + "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(url)


@router.get("/instagram/callback")
async def instagram_callback(
    code: str = None,
    state: str = None,
    error: str = None,
    db: Session = Depends(get_session)
):
    """
    Handle Instagram OAuth callback.
    """
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")
    
    user_id = state
    config = OAuthConfig.META
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        response = await client.get(
            config["token_url"],
            params={
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": get_redirect_uri("instagram")
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code")
        
        tokens = response.json()
    
    # Get long-lived token
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://graph.instagram.com/access_token",
            params={
                "grant_type": "ig_exchange_token",
                "client_secret": config["client_secret"],
                "access_token": tokens["access_token"]
            }
        )
        
        if response.status_code == 200:
            long_lived = response.json()
            tokens["access_token"] = long_lived.get("access_token", tokens["access_token"])
            tokens["expires_in"] = long_lived.get("expires_in", 3600)
    
    # Get user info
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://graph.instagram.com/me",
            params={
                "fields": "id,username",
                "access_token": tokens["access_token"]
            }
        )
        user_info = response.json() if response.status_code == 200 else {}
    
    # Calculate expiry
    expires_at = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))
    
    # Save to database
    _ = save_social_account(
        db=db,
        user_id=user_id,
        platform="instagram",
        access_token=tokens["access_token"],
        expires_at=expires_at,
        account_id=user_info.get("id"),
        account_name=user_info.get("username"),
        scope=",".join(config["scopes"])
    )
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(f"{frontend_url}/settings?connected=instagram")


# ========================================
# ACCOUNT MANAGEMENT
# ========================================

@router.get("/accounts/{user_id}")
async def get_connected_accounts(user_id: str, db: Session = Depends(get_session)):
    """
    Get all connected social accounts for a user.
    Returns safe data (no tokens).
    """
    from sqlmodel import select
    
    statement = select(SocialAccount).where(SocialAccount.user_id == user_id)
    accounts = db.exec(statement).all()
    
    return {
        "user_id": user_id,
        "accounts": [a.to_safe_dict() for a in accounts],
        "count": len(accounts),
        "platforms": [a.platform for a in accounts if a.is_active]
    }


@router.delete("/accounts/{account_id}")
async def disconnect_account(account_id: str, db: Session = Depends(get_session)):
    """
    Disconnect (deactivate) a social account.
    """
    from sqlmodel import select
    import uuid
    
    statement = select(SocialAccount).where(SocialAccount.id == uuid.UUID(account_id))
    account = db.exec(statement).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    account.is_active = False
    account.updated_at = datetime.utcnow()
    db.add(account)
    db.commit()
    
    return {
        "status": "disconnected",
        "platform": account.platform,
        "account_id": str(account.id)
    }


# ========================================
# TOKEN REFRESH
# ========================================

@router.post("/accounts/{account_id}/refresh")
async def refresh_token(account_id: str, db: Session = Depends(get_session)):
    """
    Refresh an expired access token.
    """
    from sqlmodel import select
    import uuid
    
    statement = select(SocialAccount).where(SocialAccount.id == uuid.UUID(account_id))
    account = db.exec(statement).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    refresh_token = account.get_refresh_token()
    if not refresh_token:
        raise HTTPException(status_code=400, detail="No refresh token available")
    
    # Platform-specific refresh
    if account.platform == "youtube":
        config = OAuthConfig.GOOGLE
        async with httpx.AsyncClient() as client:
            response = await client.post(
                config["token_url"],
                data={
                    "client_id": config["client_id"],
                    "client_secret": config["client_secret"],
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token"
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Token refresh failed")
            
            tokens = response.json()
            account.set_access_token(tokens["access_token"])
            if "expires_in" in tokens:
                account.expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
            account.updated_at = datetime.utcnow()
            account.sync_error = None
            
            db.add(account)
            db.commit()
    
    return {
        "status": "refreshed",
        "platform": account.platform,
        "expires_at": account.expires_at.isoformat() if account.expires_at else None
    }
