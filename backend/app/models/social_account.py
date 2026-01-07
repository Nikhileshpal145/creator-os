"""
Social Account Model

Stores OAuth tokens for connected social platforms per user.
Supports: YouTube, Instagram, LinkedIn, Twitter, TikTok
"""

import base64
import os
import uuid
from datetime import datetime
from typing import Optional

from cryptography.fernet import Fernet
from sqlmodel import Field, SQLModel


class SocialAccount(SQLModel, table=True):
    """
    Stores OAuth tokens for each user's connected social accounts.

    Security: Tokens are encrypted at rest using Fernet (AES-128).
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str = Field(index=True)  # References user

    # Platform info
    platform: str = Field(index=True)  # youtube, instagram, linkedin, twitter, tiktok
    account_id: Optional[str] = None  # Platform's user ID
    account_name: Optional[str] = None  # Display name on platform
    account_email: Optional[str] = None
    profile_picture: Optional[str] = None

    # OAuth tokens (encrypted)
    access_token_encrypted: str = Field(default="")
    refresh_token_encrypted: Optional[str] = None

    # Token metadata
    token_type: str = Field(default="Bearer")
    scope: Optional[str] = None
    expires_at: Optional[datetime] = None

    # Status
    is_active: bool = Field(default=True)
    last_synced_at: Optional[datetime] = None
    sync_error: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # ========================================
    # TOKEN ENCRYPTION
    # ========================================

    @staticmethod
    def _get_cipher():
        """Get Fernet cipher for encryption/decryption."""
        # Prefer configured key loaded into Settings (if available), fall back to raw environment.
        try:
            from app.core.config import settings

            key = settings.TOKEN_ENCRYPTION_KEY or os.getenv("TOKEN_ENCRYPTION_KEY")
        except Exception:
            # If Settings can't be imported for any reason, fall back to environment lookup
            key = os.getenv("TOKEN_ENCRYPTION_KEY")
        if not key:
            # Generate a default key for development (keeps local dev ergonomic).
            # In production, this MUST be set and is validated at startup.
            key = base64.urlsafe_b64encode(b"creator-os-dev-key-32b!").decode()

        # Ensure key is valid Fernet format (32 bytes, base64-encoded)
        try:
            return Fernet(key.encode() if isinstance(key, str) else key)
        except Exception:
            # Fallback: generate valid key from input
            padded_key = (key + "=" * 32)[:32]
            valid_key = base64.urlsafe_b64encode(padded_key.encode())
            return Fernet(valid_key)

    def set_access_token(self, token: str):
        """Encrypt and store access token."""
        cipher = self._get_cipher()
        self.access_token_encrypted = cipher.encrypt(token.encode()).decode()

    def get_access_token(self) -> Optional[str]:
        """Decrypt and return access token."""
        if not self.access_token_encrypted:
            return None
        try:
            cipher = self._get_cipher()
            return cipher.decrypt(self.access_token_encrypted.encode()).decode()
        except Exception:
            return None

    def set_refresh_token(self, token: str):
        """Encrypt and store refresh token."""
        cipher = self._get_cipher()
        self.refresh_token_encrypted = cipher.encrypt(token.encode()).decode()

    def get_refresh_token(self) -> Optional[str]:
        """Decrypt and return refresh token."""
        if not self.refresh_token_encrypted:
            return None
        try:
            cipher = self._get_cipher()
            return cipher.decrypt(self.refresh_token_encrypted.encode()).decode()
        except Exception:
            return None

    def is_expired(self) -> bool:
        """Check if access token is expired."""
        if not self.expires_at:
            return False
        return datetime.utcnow() >= self.expires_at

    def to_safe_dict(self) -> dict:
        """Return dict without sensitive data (for API responses)."""
        return {
            "id": str(self.id),
            "platform": self.platform,
            "account_name": self.account_name,
            "account_email": self.account_email,
            "profile_picture": self.profile_picture,
            "is_active": self.is_active,
            "is_expired": self.is_expired(),
            "last_synced_at": self.last_synced_at.isoformat()
            if self.last_synced_at
            else None,
            "created_at": self.created_at.isoformat(),
        }


# ========================================
# HELPER FUNCTIONS
# ========================================


def get_user_token(db, user_id: str, platform: str) -> Optional[SocialAccount]:
    """
    Get user's token for a specific platform.

    Usage:
        account = get_user_token(db, user_id, "youtube")
        if account:
            token = account.get_access_token()
    """
    from sqlmodel import select

    statement = select(SocialAccount).where(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == platform,
        SocialAccount.is_active,
    )
    return db.exec(statement).first()


def get_user_platforms(db, user_id: str) -> list:
    """Get all connected platforms for a user."""
    from sqlmodel import select

    statement = select(SocialAccount).where(
        SocialAccount.user_id == user_id, SocialAccount.is_active
    )
    accounts = db.exec(statement).all()
    return [a.platform for a in accounts]


def save_social_account(
    db,
    user_id: str,
    platform: str,
    access_token: str,
    refresh_token: Optional[str] = None,
    expires_at: Optional[datetime] = None,
    account_id: Optional[str] = None,
    account_name: Optional[str] = None,
    account_email: Optional[str] = None,
    profile_picture: Optional[str] = None,
    scope: Optional[str] = None,
) -> SocialAccount:
    """
    Save or update a social account connection.
    """
    from sqlmodel import select

    # Check if account already exists
    statement = select(SocialAccount).where(
        SocialAccount.user_id == user_id, SocialAccount.platform == platform
    )
    existing = db.exec(statement).first()

    if existing:
        # Update existing
        existing.set_access_token(access_token)
        if refresh_token:
            existing.set_refresh_token(refresh_token)
        existing.expires_at = expires_at
        existing.account_id = account_id or existing.account_id
        existing.account_name = account_name or existing.account_name
        existing.account_email = account_email or existing.account_email
        existing.profile_picture = profile_picture or existing.profile_picture
        existing.scope = scope or existing.scope
        existing.is_active = True
        existing.updated_at = datetime.utcnow()
        existing.sync_error = None

        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new
        account = SocialAccount(
            user_id=user_id,
            platform=platform,
            account_id=account_id,
            account_name=account_name,
            account_email=account_email,
            profile_picture=profile_picture,
            expires_at=expires_at,
            scope=scope,
        )
        account.set_access_token(access_token)
        if refresh_token:
            account.set_refresh_token(refresh_token)

        db.add(account)
        db.commit()
        db.refresh(account)
        return account
