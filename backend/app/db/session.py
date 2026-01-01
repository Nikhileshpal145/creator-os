from sqlmodel import create_engine, Session

# Note: "localhost" works when running locally.
# If running inside Docker, change "localhost" to "db" (or "postgres" based on our docker-compose service name)
# We use "postgres" as the service name in docker-compose.yml
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session
