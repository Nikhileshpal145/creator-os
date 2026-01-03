# backend/app/agents/base.py
"""Base class for all native agents.
Each agent implements an async ``run`` method that receives a ``context`` dict
and returns any serialisable result. ``should_run`` can be overridden to
short‑circuit agents when their inputs are missing.
"""

from __future__ import annotations
from typing import Any, Dict


class BaseAgent:
    """Common contract for all agents.

    Attributes
    ----------
    name: str
        Human‑readable identifier used in orchestration results.
    """

    name: str = "base"

    async def should_run(self, ctx: Dict[str, Any]) -> bool:
        """Return ``True`` if the agent should be executed for the given context.
        Sub‑classes can inspect ``ctx`` (e.g., presence of an image) and decide.
        The default implementation always runs.
        """
        return True

    async def run(self, ctx: Dict[str, Any]) -> Any:
        """Perform the agent's work.
        Must be overridden by concrete agents.
        """
        raise NotImplementedError(f"{self.__class__.__name__}.run() not implemented")
