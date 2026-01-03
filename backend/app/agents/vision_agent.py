# backend/app/agents/vision_agent.py
"""Vision agent that processes images.
It decodes a base64 image, detects faces, and returns simple signals.
"""

from .base import BaseAgent
from .utils import decode_image, detect_face

class VisionAgent(BaseAgent):
    name = "vision"

    async def should_run(self, ctx):
        # Run only when an image is provided in the request context
        return bool(ctx.get("image"))

    async def analyze(self, ctx):
        """Analyze the image using AI + Local CV fallback."""
        import base64
        
        b64_image = ctx.get("image")
        if not b64_image:
             return {}

        # Decode for both local and AI use
        img = decode_image(b64_image)
        
        # 1. Try AI Analysis (Gemini Flash via VisionAIService)
        ai_result = {}
        try:
            from app.services.vision_ai import VisionAIService
            
            # Use the optimized Gemini 2.0 Flash service
            # It expects the base64 string directly (it handles cleaning)
            ai_result = VisionAIService.analyze_image(b64_image)
            
            # Map VisionAIService result format to Agent format
            # VisionAIService returns: { visual_score, feedback, market_prediction }
            # We need to adapt it if necessary, but we can also just use it.
            
            caption = f"Visual Score: {ai_result.get('visual_score')}/100. Prediction: {ai_result.get('market_prediction')}. Feedback: {', '.join(ai_result.get('feedback', []))}"
            
            ai_result = {
                "caption": caption,
                "signals": ["ai_analyzed", "gemini_flash"],
                "risk": "low" if ai_result.get("visual_score", 0) > 50 else "medium"
            }
            
        except Exception as e:
            print(f"Vision Agent Gemini Error: {e}")
            # Fallback to older method or just local
            ai_result = {"signals": ["local_fallback_needed"]}

        # 2. Local fallback / Augmentation
        signals = ai_result.get("signals", [])
        risk = ai_result.get("risk", "low")
        fixes = []
        caption = ai_result.get("caption", None)

        # Always run face detection locally as it's fast and reliable for "people presence"
        if detect_face(img):
            signals.append("face_detected")
        else:
            signals.append("no_face")

        # Combine logic: if AI failed, do brightness check
        if "local_fallback_needed" in signals or not caption:
            avg_brightness = img.mean() / 255
            if avg_brightness < 0.3:
                risk = "high"
                fixes = ["increase brightness", "ensure proper lighting"]
            elif avg_brightness > 0.7:
                risk = "medium"
                fixes = ["reduce brightness to avoid washout"]
        
        # If AI succeeded, add caption to signals for Strategy Agent to see
        if caption:
            signals.append(f"caption: {caption}")

        return {"signals": signals, "risk": risk, "fixes": fixes, "description": caption}

    async def run(self, ctx):
        return await self.analyze(ctx)
