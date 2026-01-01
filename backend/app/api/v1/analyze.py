"""
Real-Time Post Analysis API
Analyzes images and captions for social media posts before publishing.
Provides performance predictions and actionable feedback.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.services.vision_ai import VisionAIService
from app.core.config import settings
import base64

router = APIRouter()


class PostAnalysisRequest(BaseModel):
    """Request to analyze a post before publishing."""
    image_base64: str
    caption: Optional[str] = None
    platform: Optional[str] = "instagram"  # instagram, twitter, linkedin


class PostAnalysisResponse(BaseModel):
    """Analysis results for a social media post."""
    visual_score: int
    caption_score: Optional[int] = None
    overall_score: int
    prediction: str  # "High Potential", "Medium Potential", "Low Potential"
    feedback: List[str]
    best_times: List[str]
    platform_tips: List[str]


@router.post("/post", response_model=PostAnalysisResponse)
async def analyze_post(request: PostAnalysisRequest):
    """
    Analyze an image and optional caption for social media performance.
    
    Returns:
    - Visual score (0-100) based on composition, lighting, engagement potential
    - Caption score (0-100) if caption provided
    - Overall score combining both
    - Performance prediction (High/Medium/Low Potential)
    - Actionable feedback tips
    - Best posting times
    - Platform-specific tips
    """
    
    # Validate API key
    if not (settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY):
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Set GEMINI_API_KEY in .env"
        )
    
    # Validate image
    try:
        # Clean base64 if it has data URI prefix
        image_data = request.image_base64
        if "base64," in image_data:
            image_data = image_data.split("base64,")[1]
        
        # Verify it's valid base64
        base64.b64decode(image_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")
    
    # Analyze image using Vision AI
    vision_result = VisionAIService.analyze_image(request.image_base64)
    
    visual_score = vision_result.get("visual_score", 0)
    feedback = vision_result.get("feedback", [])
    prediction = vision_result.get("market_prediction", "Analysis Failed")
    
    # Analyze caption if provided
    caption_score = None
    if request.caption:
        caption_score = analyze_caption(request.caption, request.platform)
        
        # Add caption feedback
        if len(request.caption) < 50:
            feedback.append("Caption is short - consider adding more context or a call-to-action")
        if not any(c in request.caption for c in ['?', '!']):
            feedback.append("Add a question or strong statement to boost engagement")
        if request.platform == "instagram" and '#' not in request.caption:
            feedback.append("Add relevant hashtags for Instagram discoverability")
    
    # Calculate overall score
    if caption_score is not None:
        overall_score = int(visual_score * 0.6 + caption_score * 0.4)
    else:
        overall_score = visual_score
    
    # Update prediction based on overall score
    if overall_score >= 80:
        prediction = "High Potential"
    elif overall_score >= 60:
        prediction = "Medium Potential"
    else:
        prediction = "Low Potential"
    
    # Get platform-specific tips
    platform_tips = get_platform_tips(request.platform, visual_score)
    
    # Best posting times by platform
    best_times = get_best_times(request.platform)
    
    return PostAnalysisResponse(
        visual_score=visual_score,
        caption_score=caption_score,
        overall_score=overall_score,
        prediction=prediction,
        feedback=feedback[:5],  # Limit to 5 tips
        best_times=best_times,
        platform_tips=platform_tips[:3]
    )


def analyze_caption(caption: str, platform: str) -> int:
    """Simple caption scoring based on engagement factors."""
    score = 50  # Base score
    
    # Length optimization
    length = len(caption)
    if platform == "twitter":
        if 100 <= length <= 200:
            score += 15
        elif length > 280:
            score -= 10
    elif platform == "instagram":
        if 150 <= length <= 300:
            score += 15
    elif platform == "linkedin":
        if 200 <= length <= 500:
            score += 15
    
    # Engagement factors
    if '?' in caption:
        score += 10  # Questions boost engagement
    if any(emoji in caption for emoji in ['🔥', '🚀', '💡', '✨', '👀', '🎯']):
        score += 5  # Emojis help
    if caption.count('#') >= 3:
        score += 5  # Hashtags for discovery
    if any(cta in caption.lower() for cta in ['comment', 'share', 'like', 'follow', 'link in bio']):
        score += 10  # Call-to-action
    
    # Cap at 100
    return min(100, max(0, score))


def get_platform_tips(platform: str, visual_score: int) -> List[str]:
    """Get platform-specific optimization tips."""
    tips = {
        "instagram": [
            "Use 1:1 or 4:5 aspect ratio for optimal display",
            "Add location tags for local discoverability",
            "Use Stories to tease this post"
        ],
        "twitter": [
            "Add alt text for accessibility and SEO",
            "Quote tweet your own post later for reach",
            "Engage with replies in first hour"
        ],
        "linkedin": [
            "Write a hook in the first 2 lines",
            "Add relevant mentions to expand reach",
            "Post during business hours (9-11 AM)"
        ]
    }
    
    return tips.get(platform, tips["instagram"])


def get_best_times(platform: str) -> List[str]:
    """Get best posting times by platform."""
    times = {
        "instagram": ["6 PM", "8 PM", "12 PM"],
        "twitter": ["9 AM", "12 PM", "5 PM"],
        "linkedin": ["9 AM", "12 PM", "5 PM"]
    }
    return times.get(platform, ["8 PM", "12 PM"])
