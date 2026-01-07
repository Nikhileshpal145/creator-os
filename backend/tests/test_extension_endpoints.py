```Creator OS/creator-os/backend/tests/test_extension_endpoints.py#L1-200
import pytest
from sqlmodel import select

from app.models.user import User
from app.models.scraped_analytics import ScrapedAnalytics
from app.services.vision_ai import VisionAIService
from app.core import security
from app.core.config import settings


def test_sync_scraped_requires_auth(client):
    """
    Calling the scraped analytics sync endpoint without an Authorization header
    should require authentication (401).
    """
    payload = {
        "platform": "linkedin",
        "url": "https://linkedin.com/in/test",
        "metrics": {"followers": 42, "views": 1000},
        "scraped_at": "2025-01-01T00:00:00Z",
    }
    res = client.post("/api/v1/analytics/sync/scraped", json=payload)
    assert res.status_code == 401, "Endpoint should require a valid bearer token"


def test_sync_scraped_success(client, session):
    """
    Authenticated request should succeed and store a ScrapedAnalytics record.
    """
    # Create a user in the test DB
    user = User(
        email="analytics_test@example.com",
        hashed_password=security.get_password_hash("password"),
        full_name="Analytics Tester",
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = security.create_access_token(subject=user.email)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "platform": "youtube",
        "url": "https://youtube.com/channel/test",
        "metrics": {"views": 1234, "followers": 100},
        "scraped_at": "2025-01-02T12:00:00Z",
    }

    res = client.post("/api/v1/analytics/sync/scraped", json=payload, headers=headers)
    assert res.status_code == 200, f"Expected 200 OK, got {res.status_code} - {res.text}"
    data = res.json()
    assert data.get("status") == "synced"
    assert data.get("platform").lower() == "youtube"

    # Verify DB record exists
    stmt = select(ScrapedAnalytics).where(ScrapedAnalytics.user_id == str(user.id))
    record = session.exec(stmt).first()
    assert record is not None, "ScrapedAnalytics record should be created"
    assert record.platform == "youtube"
    assert record.raw_metrics.get("views") == 1234 or record.views == 1234


def test_analyze_post_without_api_key_returns_503(client):
    """
    If no Gemini/Google API key is configured, the endpoint should return 503.
    (This asserts that the endpoint checks for configured vision API keys.)
    """
    payload = {
        "image_base64": "data:image/png;base64,AAAA",
        "caption": "Short caption",
        "platform": "instagram",
    }

    # Ensure keys are not set for this particular test
    original_gemini = settings.GEMINI_API_KEY
    original_google = settings.GOOGLE_API_KEY
    settings.GEMINI_API_KEY = None
    settings.GOOGLE_API_KEY = None

    res = client.post("/api/v1/analyze/post", json=payload)
    assert res.status_code == 503, "Endpoint should respond with 503 when no vision API key is configured"

    # Restore
    settings.GEMINI_API_KEY = original_gemini
    settings.GOOGLE_API_KEY = original_google


def test_analyze_post_success(client, monkeypatch):
    """
    When a vision API key is present and VisionAIService is stubbed, the
    endpoint should return analysis results (visual_score, best_times, etc).
    """
    # Ensure the service believes an API key is configured
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-key")

    # Stub VisionAIService.analyze_image to avoid external calls
    def fake_analyze(image_b64):
        return {
            "visual_score": 88,
            "feedback": ["Well composed", "Good contrast"],
            "market_prediction": "High Potential",
        }

    monkeypatch.setattr(VisionAIService, "analyze_image", staticmethod(fake_analyze))

    payload = {
        "image_base64": "data:image/png;base64,FAKEIMAGEBASE64==",
        "caption": "Test caption for analysis",
        "platform": "instagram",
    }

    res = client.post("/api/v1/analyze/post", json=payload)
    assert res.status_code == 200, f"Expected 200 OK, got {res.status_code} - {res.text}"

    data = res.json()
    # Validate presence of important analysis fields
    assert "visual_score" in data and isinstance(data["visual_score"], int)
    assert data["visual_score"] == 88
    assert "best_times" in data and isinstance(data["best_times"], list)
    assert "platform_tips" in data and isinstance(data["platform_tips"], list)
    assert "prediction" in data and isinstance(data["prediction"], str)
    assert "feedback" in data and isinstance(data["feedback"], list)
