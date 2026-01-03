
import sys
import os
import secrets
from datetime import datetime, timedelta
import random

# Add backend directory to path to import app modules
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlmodel import Session, create_engine, select
from app.models.user import User
from app.models.scraped_analytics import ScrapedAnalytics
from app.models.content import ContentDraft, ContentPerformance
from passlib.context import CryptContext

# Database URL (matching docker-compose: 5433)
DATABASE_URL = "postgresql://creator:password123@localhost:5433/creator_os"
engine = create_engine(DATABASE_URL)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_data():
    email = "nikhstudies@gmail.com"
    full_name = "Nikhilesh Pal"
    
    with Session(engine) as session:
        # 1. Upsert User
        stmt = select(User).where(User.email == email)
        user = session.exec(stmt).first()
        
        if not user:
            print(f"Creating new user: {email}")
            user = User(
                email=email,
                hashed_password=pwd_context.hash("password123"), # Default password
                full_name=full_name,
                tier="pro", # Premium tier
                onboarding_completed=True,
                business_name="Nikhilesh's Creator Studio",
                niche="Tech & AI",
                created_at=datetime.utcnow() - timedelta(days=90)
            )
            session.add(user)
        else:
            print(f"Updating existing user: {email}")
            user.full_name = full_name
            user.tier = "pro"
            user.onboarding_completed=True
            session.add(user)
            
        session.commit()
        session.refresh(user)
        
        print(f"User {user.email} is now {user.tier} tier.")
        
        # 2. Add Historical Scraped Analytics (Last 30 days)
        # Clear old analytics for this user
        delete_analytics = select(ScrapedAnalytics).where(ScrapedAnalytics.user_id == user.email)
        results = session.exec(delete_analytics).all()
        for res in results:
            session.delete(res)
            
        platforms = [
            {"name": "youtube", "base_views": 120000, "base_followers": 24000, "growth_rate": 200},
            {"name": "instagram", "base_views": 60000, "base_followers": 11000, "growth_rate": 150},
            {"name": "linkedin", "base_views": 40000, "base_followers": 8000, "growth_rate": 80},
            {"name": "twitter", "base_views": 100000, "base_followers": 14000, "growth_rate": 300},
            {"name": "facebook", "base_views": 25000, "base_followers": 4500, "growth_rate": 50}
        ]
        
        print("Seeding 30 days of historical data...")
        
        for p in platforms:
            current_views = p["base_views"]
            current_followers = p["base_followers"]
            
            # Generate 30 days of history
            for day_offset in range(30, -1, -1):
                date = datetime.utcnow() - timedelta(days=day_offset)
                
                # Add some daily variability
                daily_view_growth = p["growth_rate"] + random.randint(-50, 100)
                daily_follower_growth = random.randint(5, 20)
                
                current_views += daily_view_growth
                current_followers += daily_follower_growth
                
                analytics = ScrapedAnalytics(
                    user_id=user.email,
                    platform=p["name"],
                    views=current_views,
                    followers=current_followers,
                    subscribers=current_followers if p["name"] == "youtube" else 0,
                    engagement_rate=random.uniform(0.03, 0.12),
                    raw_metrics={
                        "likes": int(current_views * 0.05),
                        "comments": int(current_views * 0.01),
                        "shares": int(current_views * 0.005)
                    },
                    scraped_at=date
                )
                session.add(analytics)
            
        # 3. Add Content Drafts & Performance (Recent Posts)
        # Clear old drafts
        delete_drafts = select(ContentDraft).where(ContentDraft.user_id == user.email)
        draft_results = session.exec(delete_drafts).all()
        for res in draft_results:
            session.delete(res) # Cascade should handle performance, but let's see

        # We also need to clear orphan performances if cascade isn't set up, 
        # but let's assume it's fine or we just add new ones.
        
        sample_topics = [
            "AI Agents in 2026", "My simple desk setup", "Coding on iPad", "Why I use Linux",
            "Morning routine for devs", "Cursor Editor vs VS Code", "How to learn Python",
            "Building a SaaS in a weekend", "Dealing with burnout", "Tech stack for 2026",
            "Review of Gemini 2.0", "My favorite neovim plugins", "Remote work tips",
            "Understanding Docker", "FastAPI tutorial"
        ]
        
        print("Seeding posts and performance...")
        
        for i in range(15):
            # Create a post
            platform = random.choice(["twitter", "linkedin", "instagram", "youtube"])
            created_date = datetime.utcnow() - timedelta(days=random.randint(0, 20))
            
            draft = ContentDraft(
                user_id=user.email,
                text_content=f"{random.choice(sample_topics)} - {random.randint(1, 100)}",
                platform=platform,
                status="completed",
                ai_analysis={"score": random.randint(70, 98), "tone": "professional"},
                created_at=created_date
            )
            session.add(draft)
            session.commit() # Commit to get ID
            session.refresh(draft)
            
            # Create performance record for this post
            perf = ContentPerformance(
                draft_id=draft.id,
                views=random.randint(1000, 50000),
                likes=random.randint(50, 2000),
                comments=random.randint(5, 500),
                shares=random.randint(0, 100),
                recorded_at=created_date + timedelta(hours=4)
            )
            session.add(perf)

        session.commit()
        print("✅ Premium data seeding complete!")

if __name__ == "__main__":
    seed_data()
