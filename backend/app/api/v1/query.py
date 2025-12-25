from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from app.db.session import get_session
from app.services.nl_query_service import NLQueryService
from app.core.cache import cache_response
from app.core.dependencies import CurrentUser
from app.core.rate_limit import limiter
from pydantic import BaseModel

router = APIRouter()


class QueryRequest(BaseModel):
    query: str


class QueryResponse(BaseModel):
    status: str
    source: str
    query: str
    intent: str
    response: str
    context_used: bool
    graphs: list[dict] = []
    actions: list[dict] = []
    diagnosis: dict = {}
    confidence: float = 0.0


@router.post("/ask", response_model=QueryResponse)
@limiter.limit("20/minute")
async def ask_query(
    request: Request,
    query_request: QueryRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_session)
):
    """
    Process a natural language query about the user's analytics.
    """
    if not query_request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    try:
        service = NLQueryService(db, str(current_user.id))
        result = service.process_query(query_request.query)
        
        return QueryResponse(
            status=result["status"],
            source=result["source"],
            query=result["query"],
            intent=result["intent"],
            response=result["response"],
            context_used=result["context_used"],
            graphs=result.get("graphs", []),
            actions=result.get("actions", []),
            diagnosis=result.get("diagnosis", {}),
            confidence=result.get("confidence", 0.0)
        )
    except Exception as e:
        import traceback
        with open("backend_critical_error.log", "a") as f:
            f.write(f"Query Crash: {str(e)}\n{traceback.format_exc()}\n")
        print(f"Query processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")


@router.get("/suggestions")
@cache_response(expire_seconds=3600)
async def get_suggestions():
    """
    Get suggested questions the user can ask.
    """
    return {
        "suggestions": NLQueryService.get_suggested_questions()
    }


@router.get("/intents")
async def get_available_intents():
    """
    Get list of intents the system can classify.
    Useful for debugging or understanding capabilities.
    """
    return {
        "intents": [
            {
                "name": "repeat_posts",
                "description": "Identify posts worth repeating",
                "examples": ["Which posts should I repeat?", "What were my best posts?"]
            },
            {
                "name": "engagement_drop",
                "description": "Diagnose engagement drops",
                "examples": ["Why did my engagement drop?", "What happened to my views?"]
            },
            {
                "name": "best_content",
                "description": "Understand what content works",
                "examples": ["What content works best?", "What does my audience like?"]
            },
            {
                "name": "optimal_timing",
                "description": "Find best posting times",
                "examples": ["When should I post?", "What's the best time?"]
            },
            {
                "name": "platform_comparison",
                "description": "Compare platform performance",
                "examples": ["Which platform is best?", "Compare my platforms"]
            },
            {
                "name": "growth_advice",
                "description": "Get growth recommendations",
                "examples": ["How can I grow?", "Tips to increase followers"]
            }
        ]
    }
