from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.db.session import get_session
from app.models.content import ContentDraft
from pydantic import BaseModel
from typing import Optional
from app.services.vision_ai import VisionAIService

router = APIRouter()



class AnalyzeRequest(BaseModel):
    user_id: str
    text: str
    platform: str
    image_base64: Optional[str] = None # New Field

# Type for Profile Data
class ProfileData(BaseModel):
    name: str = "Unknown"
    headline: str = ""
    posts: list = []
    platform: str = "linkedin"
    url: str = ""

class ProfileAnalyzeRequest(BaseModel):
    user_id: str
    profile_data: ProfileData

@router.post("/analyze")
def analyze_content(request: AnalyzeRequest, db: Session = Depends(get_session)):
    # 1. Existing Text Analysis (Mock)
    # ... (Keep existing logic or simplify)
    
    ai_results = {
        "score": 80,
        "feedback": "Good text length."
    }
    
    # 2. Vision Analysis (If image provided)
    if request.image_base64:
        vision_results = VisionAIService.analyze_image(request.image_base64)
        ai_results.update(vision_results) # Merge results

    # 3. Create Draft
    draft = ContentDraft(
        user_id=request.user_id,
        text_content=request.text,
        platform=request.platform,
        status="completed",
        ai_analysis=ai_results
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    
    # 2. Trigger Celery Task (Pseudo-code for now)
    # task = celery_app.send_task("analyze_content", args=[str(draft.id)])
    
    return {"id": str(draft.id), "message": "Analysis started"}

@router.post("/analyze/profile")
def analyze_profile(request: ProfileAnalyzeRequest):
    data = request.profile_data
    print(f"🧠 Analysis Service: Analyzing Profile for {data.name}")
    
    # Mock AI Logic for Profile Analysis
    insights = []
    
    # 1. Headline Analysis
    if len(data.headline) < 10:
        insights.append("⚠️ Headline is too short. Add keywords like 'Founder', 'Engineer'.")
    elif "help" in data.headline.lower() or "scale" in data.headline.lower():
        insights.append("✅ Great 'benefit-driven' headline.")
    else:
        insights.append("💡 Suggestion: Make your headline more outcome-focused.")
        
    # 2. Post Consistency
    if len(data.posts) == 0:
        insights.append("⚠️ No recent posts detected. Consistency is key!")
    else:
        insights.append(f"✅ Found {len(data.posts)} recent posts. Good activity.")
        
        # Check text length of last post
        last_post_len = len(data.posts[0].get('text', ''))
        if last_post_len > 200:
             insights.append("📝 Last post had good depth (>200 chars).")
        else:
             insights.append("💡 Try writing longer, story-based posts.")

    return {
        "status": "success",
        "profile_name": data.name,
        "insights": insights,
        "market_trends": ["AI Agents", "Personal Branding", "System Design"] # Mock Trends
    }
