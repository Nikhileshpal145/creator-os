# backend/app/services/agent_memory.py
"""Utility functions for persisting and retrieving per‑user memory.
These are thin wrappers around the SQLModel ``AgentMemory`` table.
"""

from sqlmodel import Session, select
from ..models.agent_memory import AgentMemory
from datetime import datetime
from typing import Any, Optional


def save_memory(session: Session, user_id: str, key: str, value: Any) -> None:
    """Insert or update a memory entry for a user.
    If the key already exists, it is overwritten with a new timestamp.
    """
    stmt = select(AgentMemory).where(AgentMemory.user_id == user_id, AgentMemory.key == key)
    existing = session.exec(stmt).first()
    if existing:
        existing.value = value
        existing.timestamp = datetime.utcnow()
        session.add(existing)
    else:
        mem = AgentMemory(user_id=user_id, key=key, value=value)
        session.add(mem)
    session.commit()


def load_memory(session: Session, user_id: str, key: str) -> Optional[Any]:
    """Retrieve a memory entry for a user, or ``None`` if not present."""
    stmt = select(AgentMemory.value).where(AgentMemory.user_id == user_id, AgentMemory.key == key)
    result = session.exec(stmt).first()
    return result
