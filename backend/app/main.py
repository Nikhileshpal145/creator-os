from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine
from sqlmodel import SQLModel
# Import models so SQLModel knows about them
from app.core.config import settings
import sentry_sdk
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter
from app.api.v1 import analysis
from app.api.v1 import analytics
from app.api.v1 import user_settings
from app.api.v1 import auth
from app.api.v1 import intelligence
from app.api.v1 import query
from app.api.v1 import strategy
from app.api.v1 import multimodal
from app.api.v1 import integrations
from app.api.v1 import automation
from app.api.v1 import oauth
from app.api.v1 import agent
from app.api.v1 import agent_schedule
from app.api.v1 import dashboard
from app.api.v1 import scrape
from app.api.v1 import stream
from app.api.v1 import trends

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

app = FastAPI(
    title="Creator OS API",
    description="Backend API for the Content Creator OS. \n\nFeatures:\n* **Multi-Platform Analytics** (YouTube, Instagram)\n* **AI Strategy Generation**\n* **Automated Content Scheduling**",
    version="1.0.0",
    contact={
        "name": "Creator OS Support",
        "email": "support@creatoros.ai",
    },
    license_info={
        "name": "Proprietary",
    },
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"(http://localhost:\d+|chrome-extension://.*)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    # Create tables automatically
    # This will fail if DB is not running, but that's expected for now
    try:
        SQLModel.metadata.create_all(engine)
    except Exception as e:
        print(f"Warning: Could not connect to database to create tables. {e}")

@app.get("/")
def root():
    return {"status": "Creator OS is Online"}

@app.get("/health")
def health_check():
    """Health check endpoint for extension connectivity."""
    return {"status": "ok", "service": "creator-os-backend"}

# Import and include router


app.include_router(analysis.router, prefix="/api/v1/analysis")
app.include_router(analytics.router, prefix="/api/v1/analytics")
app.include_router(user_settings.router, prefix="/api/v1/user")
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(intelligence.router, prefix="/api/v1/intelligence", tags=["intelligence"])
app.include_router(query.router, prefix="/api/v1/query", tags=["query"])
app.include_router(strategy.router, prefix="/api/v1/strategy", tags=["strategy"])
app.include_router(multimodal.router, prefix="/api/v1/analyze", tags=["multimodal"])
app.include_router(integrations.router, prefix="/api/v1/integrations", tags=["integrations"])
app.include_router(automation.router, prefix="/api/v1/automation", tags=["automation"])
app.include_router(oauth.router, prefix="/auth", tags=["oauth"])
app.include_router(agent.router, prefix="/api/v1/agent", tags=["agent"])
app.include_router(agent_schedule.router, prefix="/api/v1/agent", tags=["agent"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(scrape.router, prefix="/api/v1/scrape", tags=["scrape"])
app.include_router(stream.router, prefix="/api/v1/stream", tags=["stream"])
app.include_router(trends.router, prefix="/api/v1/trends", tags=["trends"])



