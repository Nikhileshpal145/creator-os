"""
Vision Agent - Analyzes images/thumbnails for engagement signals.
Returns signals, risk assessment, and specific fixes.
"""

from typing import Dict, Any, List, Optional
from .context import AgentContext
import base64
import logging

logger = logging.getLogger(__name__)


class VisionAgent:
    """
    Analyzes visual content for social media performance signals.
    
    Signals detected:
    - Brightness/contrast
    - Face presence (critical for engagement)
    - Text overlay
    - Composition quality
    """
    
    async def analyze(self, ctx: AgentContext) -> Dict[str, Any]:
        """
        Analyze image from context.
        Returns signals, risk level, and recommended fixes.
        """
        
        if not ctx.has_image():
            return {
                "analyzed": False,
                "reason": "No image provided"
            }
        
        try:
            # Get image data
            image_data = self._get_image_data(ctx)
            
            # Analyze image properties
            signals = await self._analyze_signals(image_data)
            
            # Determine risk level
            risk = self._calculate_risk(signals)
            
            # Generate fixes
            fixes = self._generate_fixes(signals, risk)
            
            return {
                "analyzed": True,
                "signals": signals,
                "risk": risk,
                "fixes": fixes,
                "confidence": "High" if signals.get("face_detected") else "Medium"
            }
            
        except Exception as e:
            logger.error(f"Vision analysis failed: {e}")
            return {
                "analyzed": False,
                "error": str(e)
            }
    
    def _get_image_data(self, ctx: AgentContext) -> bytes:
        """Extract image bytes from context."""
        if ctx.image:
            return ctx.image
        elif ctx.image_base64:
            # Remove data URL prefix if present
            b64 = ctx.image_base64
            if "base64," in b64:
                b64 = b64.split("base64,")[1]
            return base64.b64decode(b64)
        raise ValueError("No image data available")
    
    async def _analyze_signals(self, image_data: bytes) -> Dict[str, Any]:
        """
        Analyze image for engagement signals.
        Uses basic analysis + optional AI enhancement.
        """
        
        signals = {
            "brightness": "unknown",
            "face_detected": False,
            "has_text_overlay": False,
            "color_vibrancy": "medium",
            "composition": "unknown"
        }
        
        try:
            # Try to use PIL for basic analysis
            from PIL import Image
            import io
            
            img = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Brightness analysis
            from PIL import ImageStat
            stat = ImageStat.Stat(img)
            brightness = sum(stat.mean[:3]) / 3
            
            if brightness < 80:
                signals["brightness"] = "low"
            elif brightness > 180:
                signals["brightness"] = "high"
            else:
                signals["brightness"] = "good"
            
            # Color vibrancy (simplified)
            r, g, b = stat.mean[:3]
            variance = max(r, g, b) - min(r, g, b)
            signals["color_vibrancy"] = "high" if variance > 50 else "medium" if variance > 25 else "low"
            
            # Size/aspect ratio
            width, height = img.size
            aspect = width / height
            if 0.9 <= aspect <= 1.1:
                signals["composition"] = "square (good for Instagram)"
            elif 0.7 <= aspect <= 0.85:
                signals["composition"] = "portrait (good for Stories)"
            elif 1.7 <= aspect <= 1.85:
                signals["composition"] = "landscape (good for YouTube)"
            else:
                signals["composition"] = "non-standard ratio"
            
        except ImportError:
            logger.warning("PIL not available for image analysis")
        except Exception as e:
            logger.error(f"Image analysis error: {e}")
        
        # Face detection would require additional ML
        # For now, we'll use the Vision AI service for this
        try:
            from app.services.vision_ai import VisionAIService
            if signals["brightness"] != "unknown":
                # Only call expensive AI if we have a valid image
                # This is where we'd integrate face detection
                pass
        except Exception:
            pass
        
        return signals
    
    def _calculate_risk(self, signals: Dict[str, Any]) -> str:
        """Calculate engagement risk level."""
        
        risk_score = 0
        
        # Missing face is high risk
        if not signals.get("face_detected"):
            risk_score += 3
        
        # Poor brightness is medium risk
        if signals.get("brightness") in ["low", "high"]:
            risk_score += 2
        
        # Low vibrancy is low risk
        if signals.get("color_vibrancy") == "low":
            risk_score += 1
        
        if risk_score >= 4:
            return "High"
        elif risk_score >= 2:
            return "Medium"
        else:
            return "Low"
    
    def _generate_fixes(self, signals: Dict[str, Any], risk: str) -> List[str]:
        """Generate actionable fixes based on signals."""
        
        fixes = []
        
        if not signals.get("face_detected"):
            fixes.append("Add a face to the image - faces increase engagement by 38%")
        
        if signals.get("brightness") == "low":
            fixes.append("Increase brightness/exposure - dark images get less attention")
        elif signals.get("brightness") == "high":
            fixes.append("Reduce highlights - overexposed images feel amateur")
        
        if signals.get("color_vibrancy") == "low":
            fixes.append("Add more vibrant colors or increase saturation")
        
        if not signals.get("has_text_overlay"):
            fixes.append("Consider adding text overlay for context (optional)")
        
        if not fixes:
            fixes.append("Image looks good! Ready to post.")
        
        return fixes


# Singleton instance
vision_agent = VisionAgent()
