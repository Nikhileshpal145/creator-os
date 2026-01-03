from app.services.agent_memory import save_memory, load_memory
from app.db.session import engine
from sqlmodel import Session

class AgentMemory:
    """Simple memory manager for agents.
    Stores observations and decisions per user.
    """

    def __init__(self):
        pass

    def store(self, user_id: str, observation: dict, decision: dict):
        """Persist observation and decision for a user.
        Stores two entries: one for the observation and one for the decision.
        """
        with Session(engine) as session:
            # Store observation
            save_memory(session, user_id, "last_observation", observation)
            # Store decision
            save_memory(session, user_id, "last_decision", decision)

    def load_observation(self, user_id: str):
        with Session(engine) as session:
            return load_memory(session, user_id, "last_observation")

    def load_decision(self, user_id: str):
        with Session(engine) as session:
            return load_memory(session, user_id, "last_decision")

