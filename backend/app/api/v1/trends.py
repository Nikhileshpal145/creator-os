"""
Trends API - Real-time market trends using AI
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import google.generativeai as genai
from app.core.config import settings
import json
import re

router = APIRouter()

# Configure Gemini
if settings.OPENAI_API_KEY:  # We're using this field for Gemini key too
    genai.configure(api_key=settings.OPENAI_API_KEY)


class Trend(BaseModel):
    id: str
    title: str
    description: str
    category: str
    relevance: str  # Why it matters for creators
    platforms: List[str]
    engagement_potential: str  # High, Medium, Low
    timestamp: str


class TrendsResponse(BaseModel):
    trends: List[Trend]
    generated_at: str
    source: str


@router.get("/latest")
async def get_latest_trends(category: Optional[str] = None) -> TrendsResponse:
    """
    Get latest trending topics using AI.
    Optionally filter by category.
    """
    try:
        trends = await generate_ai_trends(category)
        return TrendsResponse(
            trends=trends,
            generated_at=datetime.utcnow().isoformat(),
            source="AI-Generated based on current market analysis"
        )
    except Exception as e:
        # Fallback to static trends if AI fails
        return TrendsResponse(
            trends=get_fallback_trends(category),
            generated_at=datetime.utcnow().isoformat(),
            source="Curated trends (AI temporarily unavailable)"
        )


async def generate_ai_trends(category: Optional[str] = None) -> List[Trend]:
    """Generate trending topics using Gemini AI."""
    
    category_filter = f" focusing on {category}" if category else ""
    
    prompt = f"""You are a social media trends analyst. Generate 6 current trending topics{category_filter} that content creators should know about.

For each trend, provide:
1. A catchy title
2. A brief description (2-3 sentences)
3. Category (one of: Technology, Business, Entertainment, Social Media, AI & Tech, Lifestyle)
4. Why it matters for content creators (1-2 sentences)
5. Which platforms it's trending on (array of: YouTube, Instagram, TikTok, Twitter, LinkedIn, Facebook)
6. Engagement potential (High, Medium, or Low)

Return ONLY a valid JSON array with objects containing: title, description, category, relevance, platforms, engagement_potential

Example format:
[
  {{
    "title": "AI Video Generation Tools",
    "description": "New AI tools are making video creation accessible to everyone.",
    "category": "AI & Tech",
    "relevance": "Creators can produce more content faster with AI assistance.",
    "platforms": ["YouTube", "TikTok", "Instagram"],
    "engagement_potential": "High"
  }}
]

Generate trends that are relevant to TODAY ({datetime.utcnow().strftime('%B %d, %Y')}).
"""

    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        
        # Parse the response
        response_text = response.text
        
        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'\[[\s\S]*\]', response_text)
        if json_match:
            trends_data = json.loads(json_match.group())
        else:
            raise ValueError("No valid JSON found in response")
        
        # Convert to Trend objects
        trends = []
        for i, t in enumerate(trends_data):
            trends.append(Trend(
                id=f"trend-{i+1}-{datetime.utcnow().strftime('%Y%m%d')}",
                title=t.get("title", "Trending Topic"),
                description=t.get("description", ""),
                category=t.get("category", "General"),
                relevance=t.get("relevance", "Stay ahead of the curve."),
                platforms=t.get("platforms", ["YouTube", "Instagram"]),
                engagement_potential=t.get("engagement_potential", "Medium"),
                timestamp=datetime.utcnow().isoformat()
            ))
        
        return trends
        
    except Exception as e:
        print(f"AI trend generation failed: {e}")
        raise


def get_fallback_trends(category: Optional[str] = None) -> List[Trend]:
    """Return curated fallback trends if AI is unavailable."""
    
    all_trends = [
        Trend(
            id="trend-1",
            title="Short-Form Video Dominance",
            description="Short-form videos continue to dominate across all platforms. TikTok, Reels, and Shorts are seeing record engagement.",
            category="Social Media",
            relevance="Creators should prioritize vertical, snappy content under 60 seconds for maximum reach.",
            platforms=["TikTok", "Instagram", "YouTube"],
            engagement_potential="High",
            timestamp=datetime.utcnow().isoformat()
        ),
        Trend(
            id="trend-2",
            title="AI-Powered Content Creation",
            description="AI tools for writing, editing, and generating content are becoming mainstream among creators.",
            category="AI & Tech",
            relevance="Use AI to speed up your workflow but maintain your unique voice and style.",
            platforms=["YouTube", "LinkedIn", "Twitter"],
            engagement_potential="High",
            timestamp=datetime.utcnow().isoformat()
        ),
        Trend(
            id="trend-3",
            title="Authentic Behind-the-Scenes Content",
            description="Audiences are craving authenticity. BTS content and 'day in my life' videos are outperforming polished content.",
            category="Lifestyle",
            relevance="Show your real process and personality to build deeper connections with your audience.",
            platforms=["Instagram", "TikTok", "YouTube"],
            engagement_potential="High",
            timestamp=datetime.utcnow().isoformat()
        ),
        Trend(
            id="trend-4",
            title="Community Building & Memberships",
            description="Creators are focusing on building paid communities through Discord, Patreon, and YouTube memberships.",
            category="Business",
            relevance="Diversify income and reduce platform dependency by building a direct relationship with your top fans.",
            platforms=["YouTube", "Discord", "Patreon"],
            engagement_potential="Medium",
            timestamp=datetime.utcnow().isoformat()
        ),
        Trend(
            id="trend-5",
            title="Educational Content Boom",
            description="How-to videos, tutorials, and educational content are seeing massive growth across all demographics.",
            category="Entertainment",
            relevance="Share your expertise. Even niche knowledge has an audience hungry to learn.",
            platforms=["YouTube", "LinkedIn", "TikTok"],
            engagement_potential="High",
            timestamp=datetime.utcnow().isoformat()
        ),
        Trend(
            id="trend-6",
            title="Live Shopping & Product Integration",
            description="Live shopping events and seamless product integrations are becoming key revenue streams.",
            category="Business",
            relevance="Partner with brands for live shopping events to monetize your audience in new ways.",
            platforms=["Instagram", "TikTok", "YouTube"],
            engagement_potential="Medium",
            timestamp=datetime.utcnow().isoformat()
        )
    ]
    
    if category:
        return [t for t in all_trends if t.category.lower() == category.lower()]
    
    return all_trends


@router.get("/categories")
async def get_trend_categories():
    """Get available trend categories."""
    return {
        "categories": [
            "Technology",
            "Business", 
            "Entertainment",
            "Social Media",
            "AI & Tech",
            "Lifestyle"
        ]
    }
