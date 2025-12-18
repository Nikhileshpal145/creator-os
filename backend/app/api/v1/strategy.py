from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from app.db.session import get_session
from app.services.strategy_service import StrategyService
from app.core.cache import cache_response
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()


class PredictRequest(BaseModel):
    content_preview: Optional[str] = ""
    platform: str
    post_time: Optional[str] = None  # HH:MM format


class OutcomeRequest(BaseModel):
    views: int
    likes: int
    comments: int
    shares: int


@router.get("/weekly-plan/{user_id}")
@cache_response(expire_seconds=300)
async def get_weekly_plan(user_id: str, db: Session = Depends(get_session)):
    """
    Get the weekly action plan with prioritized recommendations.
    
    Returns a list of actions sorted by priority, each with:
    - Predicted impact
    - Recommended timing
    - Category (content, timing, platform, engagement)
    """
    try:
        service = StrategyService(db, user_id)
        return service.generate_weekly_strategy()
    except Exception as e:
        print(f"Strategy error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict")
async def predict_performance(request: PredictRequest, db: Session = Depends(get_session)):
    """
    Predict how content will perform before posting.
    
    Returns predicted views, engagement, and confidence score.
    """
    try:
        # Parse post time
        post_time = None
        if request.post_time:
            try:
                hour, minute = map(int, request.post_time.split(":"))
                post_time = datetime.now().replace(hour=hour, minute=minute)
            except Exception:
                pass
        
        # Use a default user or require auth. For now "default" as in original code
        service = StrategyService(db, "default")
        return service.predict_performance(
            content_preview=request.content_preview or "",
            platform=request.platform,
            post_time=post_time
        )
    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predict")
async def predict_performance_get(
    platform: str = Query(..., description="Platform to post on"),
    time: str = Query("20:00", description="Planned post time (HH:MM)"),
    db: Session = Depends(get_session)
):
    """
    Predict performance via GET request.
    """
    service = StrategyService(db, "default")
    
    post_time = None
    try:
        hour, minute = map(int, time.split(":"))
        post_time = datetime.now().replace(hour=hour, minute=minute)
    except Exception:
        pass
        
    return service.predict_performance(content_preview="", platform=platform, post_time=post_time)


@router.get("/optimal-window/{user_id}")
@cache_response(expire_seconds=600)
async def get_optimal_window(user_id: str, platform: str = "all", db: Session = Depends(get_session)):
    """
    Get the optimal posting window for the user.
    """
    try:
        service = StrategyService(db, user_id)
        return service.get_optimal_posting_window(platform)
    except Exception as e:
        print(f"Optimal window error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/actions/{action_id}/taken")
async def mark_action_taken(action_id: str, db: Session = Depends(get_session)):
    """
    Mark an action as taken.
    
    Call this when the user decides to follow a recommendation.
    """
    try:
        service = StrategyService(db, "default")
        return service.record_action_taken(action_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/actions/{action_id}/outcome")
async def record_action_outcome(
    action_id: str, 
    outcome: OutcomeRequest, 
    db: Session = Depends(get_session)
):
    """
    Record the actual outcome of an action.
    
    Call this 24-48 hours after taking an action to feed the learning loop.
    """
    try:
        service = StrategyService(db, "default")
        return service.record_outcome(
            action_id=action_id,
            views=outcome.views,
            likes=outcome.likes,
            comments=outcome.comments,
            shares=outcome.shares
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learning/{user_id}")
@cache_response(expire_seconds=300)
async def get_learning_progress(user_id: str, db: Session = Depends(get_session)):
    """
    Get metrics on how the prediction model is learning.
    
    Shows accuracy trends and areas needing more data.
    """
    try:
        service = StrategyService(db, user_id)
        return service.get_learning_progress()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
