from app.core.celery_app import celery_app
from app.db.session import engine
from sqlmodel import Session, select
from app.models.content import ContentDraft
from app.models.social_account import SocialAccount, get_user_token
from datetime import datetime
import httpx
import logging
import asyncio

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@celery_app.task(name="app.worker.check_scheduled_posts")
def check_scheduled_posts():
    """
    Periodic task to check for posts scheduled to be published.
    """
    logger.info("Checking for scheduled posts...")
    with Session(engine) as db:
        # Find pending drafts where scheduled_time <= now
        statement = select(ContentDraft).where(
            ContentDraft.status == "pending",
            ContentDraft.scheduled_for <= datetime.utcnow()
        )
        drafts = db.exec(statement).all()
        
        for draft in drafts:
            logger.info(f"Triggering publish for draft {draft.id}")
            # Trigger publish task (async)
            publish_post.delay(str(draft.id))
            
            # Mark as processing to avoid double pickup
            draft.status = "processing"
            db.add(draft)
            db.commit()

@celery_app.task(name="app.worker.publish_post")
def publish_post(draft_id: str):
    """
    Publish a post to the specified platform using OAuth.
    """
    logger.info(f"Publishing post {draft_id}")
    
    with Session(engine) as db:
        # Fetch fresh draft
        from uuid import UUID
        draft = db.get(ContentDraft, UUID(draft_id))
        
        if not draft:
            logger.error(f"Draft {draft_id} not found")
            return "not_found"

        if draft.status == "published":
             return "already_published"

        # Get OAuth Token
        account = get_user_token(db, draft.user_id, draft.platform)
        if not account or not account.get_access_token():
            logger.error(f"No active OAuth token for user {draft.user_id} on {draft.platform}")
            draft.status = "failed"
            draft.ai_analysis = {"error": "Missing or expired OAuth token"}
            db.add(draft)
            db.commit()
            return "missing_token"
            
        token = account.get_access_token()

        # Platform specific publishing logic
        try:
            if draft.platform == "linkedin":
                # Mock LinkedIn Publish (Real API requires complex JSON body)
                # In prod: POST https://api.linkedin.com/v2/ugcPosts
                logger.info(f"Simulating publish to LinkedIn: {draft.text_content[:50]}...")
                # await _publish_linkedin(token, draft.text_content) # if async
                
            elif draft.platform == "twitter":
                # Mock Twitter Publish
                logger.info(f"Simulating publish to Twitter: {draft.text_content[:50]}...")
                
            elif draft.platform == "youtube":
                 # Mock YouTube (usually content needs video file, text is just community post?)
                 logger.info(f"Simulating publish to YouTube: {draft.text_content[:50]}...")

            # Assume success for simulation (until we implement full API clients)
            draft.status = "published"
            draft.posted_url = "https://mock-social-media.com/post/12345"
            draft.ai_analysis = {"published_at": datetime.utcnow().isoformat()}

        except Exception as e:
            logger.error(f"Publish failed: {e}")
            draft.status = "failed"
            draft.ai_analysis = {"error": str(e)}
            
        db.add(draft)
        db.commit()
    
    return f"processed_{draft.status}"

# Placeholder for other tasks
@celery_app.task(name="app.worker.sync_analytics")
def sync_analytics(user_id: str):
    logger.info(f"Syncing analytics for {user_id}")
    # Logic to fetch from APIs using SocialAccount would go here
    return "synced"

@celery_app.task(name="app.worker.generate_weekly_report")
def generate_weekly_report(user_id: str):
    logger.info(f"Generating report for {user_id}")
    return "report_generated"
