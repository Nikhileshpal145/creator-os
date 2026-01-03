# backend/app/models/agent_memory.py
"""SQLModel definition for per‑user key‑value memory used by agents.
Each row stores a ``user_id``, a ``key`` and a JSON ``value``.
"""

from sqlmodel import SQLModel, Field
from sqlalchemy import JSON
from datetime import datetime
from typing import Any, Dict

class AgentMemory(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    key: str = Field(index=True)
    value: Dict = Field(sa_type=JSON)
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
