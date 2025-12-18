"""
YouTube Data API Connector

Supports both:
- Per-user OAuth tokens (production)
- Environment API key (development)

Free tier: 10,000 units/day
https://developers.google.com/youtube/v3
"""

from typing import Dict, Any
from datetime import datetime
import os


class YouTubeConnector:
    """
    YouTube Data API v3 connector.
    
    For multi-user SaaS: Pass db and user_id to use per-user OAuth tokens.
    For development: Falls back to YOUTUBE_API_KEY env var.
    """
    
    API_BASE = "https://www.googleapis.com/youtube/v3"
    
    def __init__(self, db=None, user_id: str = None, api_key: str = None):
        self.db = db
        self.user_id = user_id
        self._api_key = api_key or os.getenv("YOUTUBE_API_KEY")
        self._access_token = None
        self._client = None
        
        # Load user token if db provided
        if db and user_id:
            self._load_user_token()
    
    def _load_user_token(self):
        """Load OAuth token from database for this user."""
        try:
            from app.models.social_account import get_user_token
            
            account = get_user_token(self.db, self.user_id, "youtube")
            if account and not account.is_expired():
                self._access_token = account.get_access_token()
        except Exception as e:
            print(f"Failed to load user token: {e}")
    
    def _get_client(self):
        """
        Initialize YouTube API client.
        Uses OAuth access token if available, else API key.
        """
        if self._client is not None:
            return self._client
        
        # Try OAuth access token first (per-user)
        if self._access_token:
            try:
                from googleapiclient.discovery import build
                from google.oauth2.credentials import Credentials
                
                creds = Credentials(token=self._access_token)
                self._client = build("youtube", "v3", credentials=creds)
                return self._client
            except ImportError:
                pass
            except Exception as e:
                print(f"OAuth client error: {e}")
        
        # Fallback to API key (development)
        if self._api_key:
            try:
                from googleapiclient.discovery import build
                self._client = build("youtube", "v3", developerKey=self._api_key)
                return self._client
            except ImportError:
                print("⚠️ google-api-python-client not installed")
            except Exception as e:
                print(f"API key client error: {e}")
        
        return None
    
    # ========================================
    # REAL API IMPLEMENTATION
    # ========================================

    def get_channel_stats(self, channel_id: str) -> Dict[str, Any]:
        """
        Get channel statistics.
        Cost: 1 unit
        """
        client = self._get_client()
        if not client:
            return {"status": "error", "error": "No YouTube credentials found"}
        
        try:
            response = client.channels().list(
                part="statistics,snippet,contentDetails",
                id=channel_id
            ).execute()
            
            if response.get("items"):
                item = response["items"][0]
                stats = item.get("statistics", {})
                snippet = item.get("snippet", {})
                
                return {
                    "status": "success",
                    "channel_id": channel_id,
                    "title": snippet.get("title"),
                    "description": snippet.get("description", "")[:200],
                    "thumbnail": snippet.get("thumbnails", {}).get("default", {}).get("url"),
                    "stats": {
                        "subscribers": int(stats.get("subscriberCount", 0)),
                        "total_views": int(stats.get("viewCount", 0)),
                        "video_count": int(stats.get("videoCount", 0))
                    },
                    "fetched_at": datetime.utcnow().isoformat()
                }
            return {"status": "error", "error": "Channel not found"}
            
        except Exception as e:
            print(f"YouTube API error: {e}")
            return {"status": "error", "error": str(e)}
    
    def get_video_stats(self, video_id: str) -> Dict[str, Any]:
        """
        Get video statistics.
        Cost: 1 unit
        """
        client = self._get_client()
        if not client:
            return {"status": "error", "error": "No YouTube credentials found"}

        try:
            response = client.videos().list(
                part="statistics,snippet,contentDetails",
                id=video_id
            ).execute()
            
            if response.get("items"):
                item = response["items"][0]
                stats = item.get("statistics", {})
                snippet = item.get("snippet", {})
                
                return {
                    "status": "success",
                    "video_id": video_id,
                    "title": snippet.get("title"),
                    "description": snippet.get("description", "")[:200],
                    "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url"),
                    "published_at": snippet.get("publishedAt"),
                    "stats": {
                        "views": int(stats.get("viewCount", 0)),
                        "likes": int(stats.get("likeCount", 0)),
                        "comments": int(stats.get("commentCount", 0))
                    },
                    "fetched_at": datetime.utcnow().isoformat()
                }
            return {"status": "error", "error": "Video not found"}
        except Exception as e:
            print(f"YouTube API error: {e}")
            return {"status": "error", "error": str(e)}
    
    def get_channel_videos(self, channel_id: str, max_results: int = 10) -> Dict[str, Any]:
        """
        Get recent videos from a channel.
        Cost: 100 units (search)
        """
        client = self._get_client()
        if not client:
            return {"status": "error", "error": "No YouTube credentials found"}

        try:
            # Use search to get latest videos from channel
            response = client.search().list(
                part="snippet",
                channelId=channel_id,
                order="date",
                type="video",
                maxResults=max_results
            ).execute()
            
            videos = []
            for item in response.get("items", []):
                videos.append({
                    "video_id": item["id"]["videoId"],
                    "title": item["snippet"]["title"],
                    "published_at": item["snippet"]["publishedAt"],
                    "thumbnail": item["snippet"]["thumbnails"]["high"]["url"]
                })
            
            return {
                "status": "success",
                "channel_id": channel_id,
                "videos": videos,
                "count": len(videos)
            }
        except Exception as e:
            print(f"YouTube API error: {e}")
            return {"status": "error", "error": str(e)}
    
    def search_videos(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        """
        Search for videos.
        Cost: 100 units
        """
        client = self._get_client()
        if not client:
            return {"status": "error", "error": "No YouTube credentials found"}

        try:
            response = client.search().list(
                part="snippet",
                q=query,
                type="video",
                order="relevance",
                maxResults=max_results
            ).execute()
            
            videos = []
            for item in response.get("items", []):
                videos.append({
                    "video_id": item["id"]["videoId"],
                    "title": item["snippet"]["title"],
                    "channel": item["snippet"]["channelTitle"],
                    "published_at": item["snippet"]["publishedAt"],
                    "thumbnail": item["snippet"]["thumbnails"]["high"]["url"]
                })
            
            return {
                "status": "success",
                "query": query,
                "videos": videos,
                "count": len(videos)
            }
        except Exception as e:
            print(f"YouTube API error: {e}")
            return {"status": "error", "error": str(e)}


# Singleton
_youtube_connector = None

def get_youtube_connector() -> YouTubeConnector:
    global _youtube_connector
    if _youtube_connector is None:
        _youtube_connector = YouTubeConnector()
    return _youtube_connector
