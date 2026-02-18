from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class AgentContext:
    """
    Unified context passed to all agents.
    Contains everything needed for perception, analysis, and reasoning.
    """
    
    # Core identifiers
    user_id: str
    platform: Optional[str] = None  # instagram, youtube, twitter, linkedin
    
    # Input data
    image: Optional[bytes] = None  # Raw image bytes
    image_base64: Optional[str] = None  # Base64 encoded image
    text: Optional[str] = None  # Caption/post text
    url: Optional[str] = None  # Current page URL
    
    # Metadata
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    source: str = "extension"  # extension, api, scheduler
    
    # Computed/enriched data (filled by agents)
    observations: Dict[str, Any] = field(default_factory=dict)
    
    def has_image(self) -> bool:
        return self.image is not None or self.image_base64 is not None
    
    def has_text(self) -> bool:
        return self.text is not None and len(self.text.strip()) > 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "platform": self.platform,
            "has_image": self.has_image(),
            "has_text": self.has_text(),
            "text_preview": self.text[:100] if self.text else None,
            "timestamp": self.timestamp,
            "source": self.source,
            "observations": self.observations
        }
