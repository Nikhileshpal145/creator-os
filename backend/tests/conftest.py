
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine, SQLModel
from app.main import app
from app.db.session import get_session
from app.core.config import settings

# Use an in-memory SQLite database for testing to avoid messing with production/dev DB
# Or use a separate Postgres DB if we had one. For now, SQLite is safest/fastest for unit tests.
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}
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
