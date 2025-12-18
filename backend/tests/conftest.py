
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine, SQLModel
from app.main import app
from app.db.session import get_session
from app.core.config import settings
from unittest.mock import MagicMock
from sqlalchemy.pool import StaticPool
# Import all models to ensure they are registered with SQLModel
from app.models import content, social_account, strategy, content_pattern, scraped_analytics, conversation_memory, user

# Use an in-memory SQLite database for testing to avoid messing with production/dev DB
# Or use a separate Postgres DB if we had one. For now, SQLite is safest/fastest for unit tests.
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

@pytest.fixture(name="session")
def session_fixture():
    """
    Creates a new database session for a test.
    """
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)

@pytest.fixture(name="client")
def client_fixture(session: Session):
    """
    Creates a TestClient that uses the overridden database session.
    """
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    
    with TestClient(app) as client:
        yield client
    
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def mock_dependencies(monkeypatch):
    """
    Mock external dependencies like Redis and Rate Limiter.
    """
    # Mock Redis for Cache
    mock_redis = MagicMock()
    mock_redis.get.return_value = None
    monkeypatch.setattr("app.core.cache.redis_client", mock_redis)

    # Disable Rate Limiter for tests
    app.state.limiter.enabled = False
    
    yield
