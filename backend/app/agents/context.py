# backend/app/agents/context.py

from typing import Optional


class AgentContext:
    def __init__(
        self,
        user_id: str,
        image: Optional[bytes] = None,
        text: Optional[str] = None,
        platform: Optional[str] = None,
        timestamp: Optional[str] = None,
    ):
        self.user_id = user_id
        self.image = image
        self.text = text
        self.platform = platform
        self.timestamp = timestamp
