"""
Trends API - Real-time market trends using AI (Hugging Face)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.core.config import settings
import json
import re
import random
import os

router = APIRouter()


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
        print(f"Trends API error: {e}")
        # Fallback to static trends if AI fails
        return TrendsResponse(
            trends=get_fallback_trends(category),
            generated_at=datetime.utcnow().isoformat(),
            source="Curated trends (AI temporarily unavailable)"
        )


async def generate_ai_trends(category: Optional[str] = None) -> List[Trend]:
    """Generate trending topics using Hugging Face AI."""
    
    # Get HF token
    hf_token = settings.HF_TOKEN or os.getenv("HF_TOKEN")
    if not hf_token:
        raise ValueError("HF_TOKEN not configured")
    
    # Import OpenAI client for HF router
    from openai import OpenAI
    
    client = OpenAI(
        api_key=hf_token,
        base_url="https://router.huggingface.co/v1"
    )
    
    category_filter = f" focusing on {category}" if category else ""
    
    # Add randomness to get different results each time
    random_seed = random.randint(1000, 9999)
    focus_areas = random.sample([
        "emerging technologies", "viral content formats", "monetization strategies",
        "audience growth tactics", "creator economy updates", "platform algorithm changes",
        "brand partnership trends", "community building", "content repurposing",
        "niche opportunities", "collaboration trends", "live streaming innovations"
    ], 3)
    
    prompt = f"""You are a social media trends analyst. Generate 6 FRESH and UNIQUE trending topics{category_filter} that content creators should know about RIGHT NOW.

IMPORTANT: Generate completely NEW and DIFFERENT trends each time. Seed: {random_seed}
Focus on these areas: {', '.join(focus_areas)}

For each trend, provide:
1. A catchy, specific title (NOT generic like "Short-Form Video" - be specific!)
2. A brief description (2-3 sentences) with specific examples or stats
3. Category (one of: Technology, Business, Entertainment, Social Media, AI & Tech, Lifestyle)
4. Why it matters for content creators (1-2 actionable sentences)
5. Which platforms it's trending on (array of: YouTube, Instagram, TikTok, Twitter, LinkedIn, Facebook)
6. Engagement potential (High, Medium, or Low)

Return ONLY a valid JSON array with objects containing: title, description, category, relevance, platforms, engagement_potential

Generate trends that are relevant to TODAY ({datetime.utcnow().strftime('%B %d, %Y')}) and are DIFFERENT from typical evergreen trends.
Be creative and specific!"""

    try:
        response = client.chat.completions.create(
            model="meta-llama/Llama-3.2-3B-Instruct",  # Small and fast
            messages=[
                {"role": "system", "content": "You are a social media trends expert. Respond with ONLY a valid JSON array."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1200,
            temperature=0.7
        )
        
        # Parse the response
        response_text = response.choices[0].message.content
        print(f"Raw trends response (first 500 chars): {response_text[:500]}")
        
        # Clean up response - remove thinking tokens, markdown, etc.
        response_text = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
        response_text = re.sub(r'```json\s*', '', response_text)
        response_text = re.sub(r'```\s*', '', response_text)
        response_text = response_text.strip()
        
        # Extract JSON array from response
        json_match = re.search(r'\[\s*\{[\s\S]*', response_text)
        if json_match:
            json_str = json_match.group()
            
            # Try to fix truncated/malformed JSON
            # Count braces to determine if we need to close
            open_braces = json_str.count('{')
            close_braces = json_str.count('}')
            open_brackets = json_str.count('[')
            close_brackets = json_str.count(']')
            
            # Add missing closing braces/brackets
            if open_braces > close_braces:
                json_str += '}' * (open_braces - close_braces)
            if open_brackets > close_brackets:
                json_str += ']' * (open_brackets - close_brackets)
            
            # Try to parse, if fails try extracting just the complete objects
            try:
                trends_data = json.loads(json_str)
            except json.JSONDecodeError:
                # Find all complete trend objects
                object_pattern = r'\{[^{}]*"title"[^{}]*"description"[^{}]*"category"[^{}]*\}'
                objects = re.findall(object_pattern, json_str)
                if objects:
                    trends_data = [json.loads(obj) for obj in objects[:6]]
                else:
                    raise ValueError("Could not parse trends from response")
        else:
            print(f"No JSON array found in: {response_text[:300]}")
            raise ValueError("No valid JSON array found in response")
        
        # Convert to Trend objects
        trends = []
        for i, t in enumerate(trends_data):
            trends.append(Trend(
                id=f"trend-{i+1}-{random_seed}",
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
