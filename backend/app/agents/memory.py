"""
Agent Memory - Persistent storage for observations and decisions.
This enables learning, auditing, and trust-building.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlmodel import Session
from app.db.session import engine
import json
import logging

logger = logging.getLogger(__name__)


class AgentMemory:
    """
    Stores agent observations and decisions for:
    - Learning from past patterns
    - Auditing agent decisions
    - Building user trust through transparency
    """
    
    def __init__(self):
        self._short_term: Dict[str, List[Dict]] = {}  # In-memory cache
        self._max_short_term = 50  # Keep last 50 per user
    
    def store(
        self,
        user_id: str,
        observation: Dict[str, Any],
        decision: Dict[str, Any],
        context_summary: Optional[str] = None
    ) -> None:
        """Store an observation-decision pair."""
        
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "observation": observation,
            "decision": decision,
            "context": context_summary
        }
        
        # Short-term memory (in-memory)
        if user_id not in self._short_term:
            self._short_term[user_id] = []
        
        self._short_term[user_id].append(entry)
        
        # Trim to max size
        if len(self._short_term[user_id]) > self._max_short_term:
            self._short_term[user_id] = self._short_term[user_id][-self._max_short_term:]
        
        # Long-term memory (database) - async in production
        try:
            self._persist_to_db(user_id, entry)
        except Exception as e:
            logger.warning(f"Failed to persist to DB: {e}")
    
    def recall(
        self,
        user_id: str,
        limit: int = 10,
        since_hours: int = 24
    ) -> List[Dict[str, Any]]:
        """Recall recent observations for a user."""
        
        # Try short-term first
        if user_id in self._short_term:
            memories = self._short_term[user_id][-limit:]
            return memories
        
        # Fall back to database
        return self._fetch_from_db(user_id, limit, since_hours)
    
    def get_patterns(self, user_id: str) -> Dict[str, Any]:
        """Extract patterns from memory for reasoning."""
        
        memories = self.recall(user_id, limit=50, since_hours=168)  # 1 week
        
        if not memories:
            return {"has_history": False}
        
        # Aggregate patterns
        vision_risks = []
        content_issues = []
        decisions_made = []
        
        for m in memories:
            obs = m.get("observation", {})
            dec = m.get("decision", {})
            
            if "vision" in obs:
                vision_risks.append(obs["vision"].get("risk", "Unknown"))
            if "content" in obs:
                content_issues.extend(obs["content"].get("issues", []))
            if "advice" in dec:
                decisions_made.extend(dec.get("advice", []))
        
        return {
            "has_history": True,
            "total_observations": len(memories),
            "common_vision_risks": self._most_common(vision_risks, 3),
            "recurring_content_issues": self._most_common(content_issues, 3),
            "past_advice": self._most_common(decisions_made, 5)
        }
    
    def _most_common(self, items: List[str], n: int) -> List[str]:
        """Get most common items."""
        if not items:
            return []
        from collections import Counter
        return [item for item, _ in Counter(items).most_common(n)]
    
    def _persist_to_db(self, user_id: str, entry: Dict) -> None:
        """Persist to database (placeholder - extend with actual model)."""
        # In production, save to AgentMemoryLog table
        logger.info(f"Memory stored for user {user_id}: {entry.get('decision', {}).get('confidence', 'N/A')}")
    
    def _fetch_from_db(
        self,
        user_id: str,
        limit: int,
        since_hours: int
    ) -> List[Dict[str, Any]]:
        """Fetch from database (placeholder)."""
        # In production, query AgentMemoryLog table
        return []


# Singleton instance
agent_memory = AgentMemory()
