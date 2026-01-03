"""Shim for Vision Agent to call VisionAIService."""
from app.services.vision_ai import VisionAIService

async def clip_analyze(image: str):
    """Call the existing Gemini Vision wrapper."""
    # VisionAIService.analyze_image is synchronous, but we wrap it in async for the agent interface
    return VisionAIService.analyze_image(image)
