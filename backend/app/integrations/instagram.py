"""
Instagram Graph API Connector

Requires Facebook App with Instagram Basic Display or Instagram Graph API access.
https://developers.facebook.com/docs/instagram-api/
"""

from typing import Dict, Any
from datetime import datetime
import os


class InstagramConnector:
    """
    Instagram Graph API connector.
    
    Requires:
    - Facebook App
    - Instagram Business or Creator account
    - Access token
    """
    
    API_BASE = "https://graph.instagram.com"
    
    def __init__(self, access_token: str = None):
        self.access_token = access_token or os.getenv("INSTAGRAM_ACCESS_TOKEN")
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make API request."""
        if not self.access_token:
            return None
        
        try:
            import httpx
            
            params = params or {}
            params["access_token"] = self.access_token
            
            response = httpx.get(f"{self.API_BASE}/{endpoint}", params=params)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Instagram API error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Instagram request error: {e}")
            return None
    
    def get_profile(self, user_id: str = "me") -> Dict[str, Any]:
        """
        Get user profile information.
        """
        data = self._make_request(
            user_id,
            params={"fields": "id,username,account_type,media_count"}
        )
        
        if data:
            return {
                "status": "success",
                "user_id": data.get("id"),
                "username": data.get("username"),
                "account_type": data.get("account_type"),
                "media_count": data.get("media_count"),
                "fetched_at": datetime.utcnow().isoformat()
            }
        return {"status": "error", "error": "Profile not found or access denied"}
    
    def get_media(self, user_id: str = "me", limit: int = 10) -> Dict[str, Any]:
        """
        Get user's recent media.
        """
        data = self._make_request(
            f"{user_id}/media",
            params={
                "fields": "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count",
                "limit": limit
            }
        )
        
        if data and data.get("data"):
            media = []
            for item in data["data"]:
                media.append({
                    "id": item.get("id"),
                    "caption": (item.get("caption") or "")[:100],
                    "media_type": item.get("media_type"),
                    "permalink": item.get("permalink"),
                    "timestamp": item.get("timestamp"),
                    "likes": item.get("like_count", 0),
                    "comments": item.get("comments_count", 0)
                })
            
            return {
                "status": "success",
                "media": media,
                "count": len(media)
            }
        return {"status": "error", "error": "Media not found"}
    
    def get_insights(self, user_id: str = "me") -> Dict[str, Any]:
        """
        Get account insights (requires Instagram Business account).
        """
        data = self._make_request(
            f"{user_id}/insights",
            params={
                "metric": "impressions,reach,profile_views,follower_count",
                "period": "day"
            }
        )
        
        if data and data.get("data"):
            insights = {}
            for item in data["data"]:
                insights[item["name"]] = item["values"][0]["value"] if item.get("values") else 0
            
            return {
                "status": "success",
                "insights": insights,
                "period": "day",
                "fetched_at": datetime.utcnow().isoformat()
            }
        return {"status": "error", "error": "Insights not available (Business account required)"}
    
    def get_media_insights(self, media_id: str) -> Dict[str, Any]:
        """
        Get insights for a specific media item.
        """
        data = self._make_request(
            f"{media_id}/insights",
            params={"metric": "impressions,reach,engagement,saved"}
        )
        
        if data and data.get("data"):
            insights = {}
            for item in data["data"]:
                insights[item["name"]] = item["values"][0]["value"] if item.get("values") else 0
            
            return {
                "status": "success",
                "media_id": media_id,
                "insights": insights
            }
        return {"status": "error", "error": "Media insights not available"}
    
    # Mock responses
    def _mock_profile(self) -> Dict[str, Any]:
        return {
            "status": "mock",
            "user_id": "mock_user",
            "username": "creator_account",
            "account_type": "BUSINESS",
            "media_count": 156,
            "fetched_at": datetime.utcnow().isoformat()
        }
    
    def _mock_media(self) -> Dict[str, Any]:
        return {
            "status": "mock",
            "media": [
                {"id": "1", "caption": "New post about AI", "media_type": "IMAGE", "likes": 452, "comments": 28},
                {"id": "2", "caption": "Behind the scenes", "media_type": "VIDEO", "likes": 1250, "comments": 95},
                {"id": "3", "caption": "Tips for creators", "media_type": "CAROUSEL_ALBUM", "likes": 890, "comments": 62}
            ],
            "count": 3
        }
    
    def _mock_insights(self) -> Dict[str, Any]:
        return {
            "status": "mock",
            "insights": {
                "impressions": 15420,
                "reach": 12350,
                "profile_views": 485,
                "follower_count": 8750
            },
            "period": "day",
            "fetched_at": datetime.utcnow().isoformat()
        }
    
    def _mock_media_insights(self, media_id: str) -> Dict[str, Any]:
        return {
            "status": "mock",
            "media_id": media_id,
            "insights": {
                "impressions": 5420,
                "reach": 4200,
                "engagement": 385,
                "saved": 52
            }
        }


# Singleton
_instagram_connector = None

def get_instagram_connector() -> InstagramConnector:
    global _instagram_connector
    if _instagram_connector is None:
        _instagram_connector = InstagramConnector()
    return _instagram_connector
