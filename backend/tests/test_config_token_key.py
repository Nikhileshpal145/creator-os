import importlib
import sys

import pytest
from cryptography.fernet import Fernet

MODULE_NAME = "app.core.config"


def _cleanup_module():
    """Remove module from sys.modules to force a fresh import on next import attempt."""
    if MODULE_NAME in sys.modules:
        del sys.modules[MODULE_NAME]


def test_missing_token_in_production_raises(monkeypatch):
    """
    When running in `production`, TOKEN_ENCRYPTION_KEY must be present.
    Importing the config module without it should raise a ValueError.
    """
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv(
        "SECRET_KEY", "test-secret-for-prod"
    )  # avoid secret-key check blocking the test
    monkeypatch.delenv("TOKEN_ENCRYPTION_KEY", raising=False)

    _cleanup_module()
    with pytest.raises(ValueError) as exc:
        importlib.import_module(MODULE_NAME)

    assert "TOKEN_ENCRYPTION_KEY" in str(exc.value), (
        "Expected failure message to mention TOKEN_ENCRYPTION_KEY"
    )
    _cleanup_module()


def test_missing_token_in_development_allows(monkeypatch):
    """
    Missing TOKEN_ENCRYPTION_KEY should be allowed in non-production environments.
    Importing the config module without it should NOT raise an error.
    """
    # Ensure we are explicitly in a non-production env
    monkeypatch.setenv("ENVIRONMENT", "development")
    # Ensure TOKEN_ENCRYPTION_KEY is not present
    monkeypatch.delenv("TOKEN_ENCRYPTION_KEY", raising=False)
    # Ensure SECRET_KEY uses the default dev value (no need to set)
    monkeypatch.delenv("SECRET_KEY", raising=False)

    _cleanup_module()
    # Import should succeed (should NOT raise)
    cfg = importlib.import_module(MODULE_NAME)

    assert getattr(cfg, "settings", None) is not None, "config should expose 'settings'"
    assert cfg.settings.is_production is False
    _cleanup_module()


def test_invalid_token_in_production_raises(monkeypatch):
    """
    If TOKEN_ENCRYPTION_KEY is present but not a valid Fernet key, importing should fail.
    """
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", "test-secret-for-prod")
    monkeypatch.setenv("TOKEN_ENCRYPTION_KEY", "not-a-valid-fernet-key")

    _cleanup_module()
    with pytest.raises(ValueError) as exc:
        importlib.import_module(MODULE_NAME)

    # The error should indicate an invalid Fernet/key format
    assert (
        "Invalid" in str(exc.value)
        or "valid Fernet" in str(exc.value)
        or "Fernet" in str(exc.value)
    ), f"Unexpected error message: {exc.value}"
    _cleanup_module()


def test_valid_token_in_production_passes(monkeypatch):
    """
    With ENVIRONMENT=production and TOKEN_ENCRYPTION_KEY set to a valid Fernet key,
    importing the config module should succeed and expose the key on settings.
    """
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", "test-secret-for-prod")

    valid_key = Fernet.generate_key().decode()
    monkeypatch.setenv("TOKEN_ENCRYPTION_KEY", valid_key)

    _cleanup_module()
    cfg = importlib.import_module(MODULE_NAME)

    # Basic checks
    assert getattr(cfg, "settings", None) is not None, "config should expose 'settings'"
    assert cfg.settings.is_production is True
    assert cfg.settings.TOKEN_ENCRYPTION_KEY == valid_key

    _cleanup_module()
