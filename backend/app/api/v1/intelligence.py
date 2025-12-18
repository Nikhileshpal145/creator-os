from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db.session import get_session
from app.services.intelligence_service import IntelligenceService
from app.core.cache import cache_response

router = APIRouter()


@router.get("/patterns/{user_id}")
@cache_response(expire_seconds=1800)  # Cache for 30 minutes
async def get_intelligence_patterns(user_id: str, db: Session = Depends(get_session)):
    """
    Get all detected patterns for a user.
    """
    try:
        service = IntelligenceService(db, user_id)
        patterns = service.get_patterns()
        
        return {
            "status": "success",
            "user_id": user_id,
            "patterns": patterns,
            "total_patterns": len(patterns)
        }
    except Exception as e:
        print(f"Intelligence service error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recommendations/{user_id}")
@cache_response(expire_seconds=1800)
async def get_intelligence_recommendations(user_id: str, db: Session = Depends(get_session)):
    """
    Get actionable recommendations based on detected patterns.
    """
    try:
        service = IntelligenceService(db, user_id)
        recommendations = service.get_recommendations()
        
        return {
            "status": "success",
            "user_id": user_id,
            "recommendations": recommendations,
            "total": len(recommendations)
        }
    except Exception as e:
        print(f"Intelligence recommendations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/{user_id}")
async def trigger_pattern_analysis(user_id: str, db: Session = Depends(get_session)):
    """
    Trigger a full pattern analysis for the user.
    """
    try:
        service = IntelligenceService(db, user_id)
        result = service.run_full_analysis()
        
        return {
            "status": result.get("status", "success"),
            "message": f"Analysis complete. Found {result.get('patterns_detected', 0)} patterns.",
            "patterns_detected": result.get("patterns_detected", 0),
            "content_analyzed": result.get("content_analyzed", 0),
            "analysis_window_days": result.get("analysis_window_days", 60)
        }
    except Exception as e:
        print(f"Pattern analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary/{user_id}")
@cache_response(expire_seconds=900)
async def get_intelligence_summary(user_id: str, db: Session = Depends(get_session)):
    """
    Get a concise summary of intelligence insights.
    """
    try:
        service = IntelligenceService(db, user_id)
        patterns = service.get_patterns()
        recommendations = service.get_recommendations()
        
        # Get top pattern (highest multiplier)
        top_pattern = max(patterns, key=lambda p: p.get("performance_multiplier", 1)) if patterns else None
        
        # Get top recommendation (priority 1)
        top_recommendation = next((r for r in recommendations if r.get("priority") == 1), recommendations[0] if recommendations else None)
        
        return {
            "status": "success",
            "user_id": user_id,
            "headline": top_pattern.get("explanation", "Keep posting to discover patterns!") if top_pattern else "Start posting to discover patterns!",
            "top_multiplier": top_pattern.get("performance_multiplier", 1.0) if top_pattern else 1.0,
            "top_recommendation": top_recommendation,
            "total_patterns": len(patterns),
            "total_recommendations": len(recommendations)
        }
    except Exception as e:
        print(f"Intelligence summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
