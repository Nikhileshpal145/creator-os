"""Content feature extraction helper for ContentAgent."""
from typing import List, Dict, Any

def extract_content_features(posts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Simple feature extraction from a list of posts."""
    if not posts:
        return {"summary": "No posts provided"}
    
    total = len(posts)
    avg_likes = sum(p.get("likes", 0) for p in posts) / total
    
    return {
        "post_count": total,
        "avg_likes": avg_likes,
        "platforms": list(set(p.get("platform", "unknown") for p in posts))
    }
