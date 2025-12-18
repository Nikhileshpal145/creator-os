from sqlmodel import create_engine, Session
from sqlalchemy.orm import sessionmaker

# Note: "localhost" works when running locally.
# If running inside Docker, change "localhost" to "db" (or "postgres" based on our docker-compose service name)
# We use "postgres" as the service name in docker-compose.yml
DATABASE_URL = "postgresql://creator:password123@localhost:5433/creator_os"

engine = create_engine(DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session
