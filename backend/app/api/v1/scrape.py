"""
Scrape API - Endpoints for universal web page scraping
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime
from urllib.parse import urlparse

from app.db.session import get_session
from app.core.dependencies import CurrentUser
from app.models.scraped_web_page import ScrapedWebPage
from app.services.playwright_service import playwright_service

router = APIRouter()

class ScrapeTriggerRequest(BaseModel):
    """Request to trigger a backend scrape job."""
    url: str
    cookies: List[Dict[str, Any]]
    user_agent: str


class ScrapePageRequest(BaseModel):
    """Request from browser extension with scraped page data."""
    url: str
    title: str
    description: Optional[str] = None
    page_type: str = "unknown"
    platform: Optional[str] = None
    scraped_content: Dict[str, Any] = {}
    detected_metrics: Dict[str, Any] = {}
    scraped_at: Optional[str] = None


@router.post("/trigger")
async def trigger_backend_scrape(
    req: ScrapeTriggerRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_session)
):
    """
    Trigger a robust backend scrape using Playwright.
    Extension passes auth cookies, Backend does the heavy lifting.
    """
    try:
        # Detect platform and route to appropriate scraper method
        if "instagram.com" in req.url:
            username = req.url.split("instagram.com/")[1].split("/")[0]
            result = await playwright_service.scrape_instagram_profile(username, req.cookies)
            
            if result.get("success"):
                # Store the result directly
                from app.models.scraped_analytics import ScrapedAnalytics
                
                scraped = ScrapedAnalytics(
                    user_id=str(current_user.id),
                    platform="instagram",
                    followers=result["metrics"].get("followers", 0),
                    raw_metrics=result["metrics"],
                    source_url=req.url,
                    scraped_at=datetime.utcnow()
                )
                db.add(scraped)
                db.commit()
                return {"status": "success", "data": result}
            else:
                 raise HTTPException(status_code=400, detail=result.get("error"))

        return {"status": "ignored", "reason": "Platform not supported for backend scraping yet"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scrape failed: {str(e)}")


@router.post("/page")
async def sync_scraped_page(
    req: ScrapePageRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_session)
):
    """
    Receive scraped page data from the browser extension.
    Stores any web page the user visits.
    """
    try:
        # Parse URL for domain and path
        parsed = urlparse(req.url)
        domain = parsed.netloc.replace("www.", "")
        path = parsed.path
        
        # Detect platform from domain
        platform = req.platform
        if not platform:
            platform = detect_platform(domain)
        
        # Create record
        scraped = ScrapedWebPage(
            user_id=str(current_user.id),
            url=req.url,
            domain=domain,
            path=path,
            page_type=req.page_type,
            platform=platform,
            title=req.title,
            description=req.description,
            scraped_content=req.scraped_content,
            detected_metrics=req.detected_metrics,
            scraped_at=datetime.fromisoformat(req.scraped_at.replace('Z', '+00:00')) if req.scraped_at else datetime.utcnow()
        )
        
        db.add(scraped)
        db.commit()
        db.refresh(scraped)
        
        return {
            "status": "synced",
            "id": str(scraped.id),
            "domain": domain,
            "page_type": req.page_type
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync scraped page: {str(e)}")


@router.get("/history")
async def get_scrape_history(
    current_user: CurrentUser,
    db: Session = Depends(get_session),
    limit: int = 50,
    domain: Optional[str] = None
):
    """Get user's scraped pages history."""
    
    statement = select(ScrapedWebPage).where(
        ScrapedWebPage.user_id == str(current_user.id)
    )
    
    if domain:
        statement = statement.where(ScrapedWebPage.domain == domain)
    
    statement = statement.order_by(ScrapedWebPage.scraped_at.desc()).limit(limit)
    
    records = db.exec(statement).all()
    
    return {
        "count": len(records),
        "pages": [
            {
                "id": str(r.id),
                "url": r.url,
                "domain": r.domain,
                "title": r.title,
                "page_type": r.page_type,
                "platform": r.platform,
                "detected_metrics": r.detected_metrics,
                "scraped_at": r.scraped_at.isoformat()
            }
            for r in records
        ]
    }


@router.get("/domains")
async def get_scraped_domains(
    current_user: CurrentUser,
    db: Session = Depends(get_session)
):
    """Get summary of domains the user has visited."""
    
    statement = select(ScrapedWebPage.domain).where(
        ScrapedWebPage.user_id == str(current_user.id)
    ).distinct()
    
    domains = db.exec(statement).all()
    
    # Count pages per domain
    domain_stats = []
    for domain in domains:
        count_stmt = select(ScrapedWebPage).where(
            ScrapedWebPage.user_id == str(current_user.id),
            ScrapedWebPage.domain == domain
        )
        count = len(db.exec(count_stmt).all())
        
        domain_stats.append({
            "domain": domain,
            "pages_visited": count,
            "platform": detect_platform(domain)
        })
    
    # Sort by pages visited
    domain_stats.sort(key=lambda x: x["pages_visited"], reverse=True)
    
    return {"domains": domain_stats}


@router.get("/analytics")
async def get_scrape_analytics(
    current_user: CurrentUser,
    db: Session = Depends(get_session),
    days: int = 7
):
    """Get analytics on scraped data."""
    
    from datetime import timedelta
    start_date = datetime.utcnow() - timedelta(days=days)
    
    statement = select(ScrapedWebPage).where(
        ScrapedWebPage.user_id == str(current_user.id),
        ScrapedWebPage.scraped_at >= start_date
    )
    
    records = db.exec(statement).all()
    
    # Aggregate
    page_types = {}
    platforms = {}
    total_metrics = {}
    
    for r in records:
        # Count page types
        page_types[r.page_type] = page_types.get(r.page_type, 0) + 1
        
        # Count platforms
        if r.platform:
            platforms[r.platform] = platforms.get(r.platform, 0) + 1
        
        # Sum detected metrics
        for key, value in r.detected_metrics.items():
            if isinstance(value, (int, float)):
                total_metrics[key] = total_metrics.get(key, 0) + value
    
    return {
        "days": days,
        "total_pages": len(records),
        "page_types": page_types,
        "platforms": platforms,
        "aggregated_metrics": total_metrics
    }


def detect_platform(domain: str) -> Optional[str]:
    """Detect platform from domain name."""
    domain_lower = domain.lower()
    
    platform_map = {
        "linkedin.com": "linkedin",
        "youtube.com": "youtube",
        "studio.youtube.com": "youtube",
        "instagram.com": "instagram",
        "twitter.com": "twitter",
        "x.com": "twitter",
        "facebook.com": "facebook",
        "tiktok.com": "tiktok",
        "reddit.com": "reddit",
        "medium.com": "medium",
        "substack.com": "substack",
        "github.com": "github",
    }
    
    for key, value in platform_map.items():
        if key in domain_lower:
            return value
    
    return None
