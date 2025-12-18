from fastapi import APIRouter, HTTPException, Query, Depends
from sqlmodel import Session
from app.db.session import get_session
from app.core.dependencies import CurrentUser
from app.models.social_account import get_user_token, SocialAccount
from app.integrations.youtube import get_youtube_connector, YouTubeConnector
from app.integrations.instagram import InstagramConnector
import os

router = APIRouter()


# ========================================
# YOUTUBE ENDPOINTS
# ========================================

@router.get("/youtube/channel/{channel_id}")
async def get_youtube_channel(
    channel_id: str, 
    user: CurrentUser, 
    db: Session = Depends(get_session)
):
    """
    Get YouTube channel statistics.
    """
    token = get_user_token(db, str(user.id), "youtube")
    connector = YouTubeConnector(access_token=token) if token else get_youtube_connector()
    return connector.get_channel_stats(channel_id)


@router.get("/youtube/video/{video_id}")
async def get_youtube_video(
    video_id: str, 
    user: CurrentUser, 
    db: Session = Depends(get_session)
):
    """
    Get YouTube video statistics.
    """
    token = get_user_token(db, str(user.id), "youtube")
    connector = YouTubeConnector(access_token=token) if token else get_youtube_connector()
    return connector.get_video_stats(video_id)


@router.get("/youtube/channel/{channel_id}/videos")
async def get_channel_videos(
    channel_id: str, 
    user: CurrentUser, 
    limit: int = Query(10, le=50),
    db: Session = Depends(get_session)
):
    """
    Get recent videos from a YouTube channel.
    """
    token = get_user_token(db, str(user.id), "youtube")
    connector = YouTubeConnector(access_token=token) if token else get_youtube_connector()
    return connector.get_channel_videos(channel_id, limit)


@router.get("/youtube/search")
async def search_youtube(
    q: str, 
    user: CurrentUser, 
    limit: int = Query(10, le=50),
    db: Session = Depends(get_session)
):
    """
    Search YouTube videos.
    """
    token = get_user_token(db, str(user.id), "youtube")
    connector = YouTubeConnector(access_token=token) if token else get_youtube_connector()
    return connector.search_videos(q, limit)


# ========================================
# INSTAGRAM ENDPOINTS
# ========================================

@router.get("/instagram/profile")
async def get_instagram_profile(
    user: CurrentUser, 
    db: Session = Depends(get_session)
):
    """
    Get Instagram profile information.
    """
    token = get_user_token(db, str(user.id), "instagram")
    if not token and not os.getenv("INSTAGRAM_ACCESS_TOKEN"):
        raise HTTPException(status_code=401, detail="Instagram not connected")
        
    connector = InstagramConnector(access_token=token)
    return connector.get_profile()


@router.get("/instagram/media")
async def get_instagram_media(
    user: CurrentUser, 
    limit: int = Query(10, le=50),
    db: Session = Depends(get_session)
):
    """
    Get recent Instagram posts.
    """
    token = get_user_token(db, str(user.id), "instagram")
    if not token and not os.getenv("INSTAGRAM_ACCESS_TOKEN"):
        raise HTTPException(status_code=401, detail="Instagram not connected")

    connector = InstagramConnector(access_token=token)
    return connector.get_media(limit=limit)


@router.get("/instagram/insights")
async def get_instagram_insights(
    user: CurrentUser, 
    db: Session = Depends(get_session)
):
    """
    Get Instagram account insights.
    """
    token = get_user_token(db, str(user.id), "instagram")
    if not token and not os.getenv("INSTAGRAM_ACCESS_TOKEN"):
        raise HTTPException(status_code=401, detail="Instagram not connected")

    connector = InstagramConnector(access_token=token)
    return connector.get_insights()


@router.get("/instagram/media/{media_id}/insights")
async def get_media_insights(
    media_id: str, 
    user: CurrentUser, 
    db: Session = Depends(get_session)
):
    """
    Get insights for a specific Instagram post.
    """
    token = get_user_token(db, str(user.id), "instagram")
    if not token and not os.getenv("INSTAGRAM_ACCESS_TOKEN"):
        raise HTTPException(status_code=401, detail="Instagram not connected")

    connector = InstagramConnector(access_token=token)
    return connector.get_media_insights(media_id)


# ========================================
# CONNECTION STATUS
# ========================================

@router.get("/status")
async def get_integration_status(
    user: CurrentUser,
    db: Session = Depends(get_session)
):
    """
    Get connection status for all integrations.
    """
    from sqlmodel import select
    
    # Check user connections in DB
    user_platforms = []
    try:
        statement = select(SocialAccount).where(SocialAccount.user_id == str(user.id), SocialAccount.is_active)
        accounts = db.exec(statement).all()
        user_platforms = [a.platform for a in accounts]
    except Exception:
        pass

    return {
        "youtube": {
            "configured": bool(os.getenv("YOUTUBE_API_KEY")) or "youtube" in user_platforms,
            "connected": "youtube" in user_platforms,
            "api_base": "https://www.googleapis.com/youtube/v3"
        },
        "instagram": {
            "configured": bool(os.getenv("META_CLIENT_ID")) or bool(os.getenv("INSTAGRAM_ACCESS_TOKEN")),
            "connected": "instagram" in user_platforms,
            "api_base": "https://graph.instagram.com"
        },
        "twitter": {
            "configured": False,
            "note": "Coming soon"
        },
        "tiktok": {
            "configured": False,
            "note": "Coming soon"
        }
    }
