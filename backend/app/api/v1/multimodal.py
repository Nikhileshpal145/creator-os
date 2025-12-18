from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.multimodal_service import get_multimodal_service
import base64

router = APIRouter()


class ImageURLRequest(BaseModel):
    url: str


class Base64ImageRequest(BaseModel):
    image_base64: str
    filename: Optional[str] = "image.jpg"


@router.post("/image")
async def analyze_image_upload(file: UploadFile = File(...)):
    """
    Analyze an uploaded image using CLIP.
    
    Returns content classification, colors, faces, and recommendations.
    """
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    
    service = get_multimodal_service()
    analysis = service.analyze_image(contents)
    
    return {
        "status": "success",
        "filename": file.filename,
        "analysis": analysis
    }


@router.post("/image/url")
async def analyze_image_url(request: ImageURLRequest):
    """
    Analyze an image from URL using CLIP.
    """
    service = get_multimodal_service()
    analysis = service.analyze_image(request.url)
    
    return {
        "status": "success",
        "url": request.url,
        "analysis": analysis
    }


@router.post("/image/base64")
async def analyze_image_base64(request: Base64ImageRequest):
    """
    Analyze a base64-encoded image using CLIP.
    """
    try:
        image_bytes = base64.b64decode(request.image_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid base64 image")
    
    service = get_multimodal_service()
    analysis = service.analyze_image(image_bytes)
    
    return {
        "status": "success",
        "analysis": analysis
    }


@router.post("/thumbnail/score")
async def score_thumbnail(file: UploadFile = File(...)):
    """
    Score a thumbnail for click-through potential.
    
    Returns a 0-100 score with breakdown of factors.
    """
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    
    service = get_multimodal_service()
    score = service.score_thumbnail(contents)
    
    return {
        "status": "success",
        "filename": file.filename,
        "score": score["score"],
        "rating": score["rating"],
        "factors": score["factors"],
        "suggestions": score["suggestions"]
    }


@router.post("/video")
async def analyze_video(file: UploadFile = File(...)):
    """
    Analyze a video using frame extraction and LLaVA.
    
    Extracts key frames and analyzes content, faces, and engagement potential.
    """
    if not file.content_type or not file.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="File must be a video")
    
    # Save temporarily for FFmpeg
    import tempfile
    import os
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
        contents = await file.read()
        tmp.write(contents)
        tmp_path = tmp.name
    
    try:
        service = get_multimodal_service()
        analysis = service.analyze_video(tmp_path)
        
        return {
            "status": "success",
            "filename": file.filename,
            "analysis": analysis
        }
    finally:
        os.unlink(tmp_path)


@router.get("/capabilities")
async def get_capabilities():
    """
    Get available analysis capabilities.
    """
    return {
        "image_analysis": {
            "available": True,
            "model": "CLIP (openai/clip-vit-base-patch32)",
            "capabilities": ["content_classification", "face_detection", "color_extraction", "text_detection"]
        },
        "video_analysis": {
            "available": True,
            "model": "CLIP + LLaVA",
            "capabilities": ["frame_extraction", "content_classification", "scene_understanding"],
            "requires": "FFmpeg, Ollama (optional)"
        },
        "thumbnail_scoring": {
            "available": True,
            "factors": ["face_presence", "color_vibrancy", "quality", "text_overlay"]
        }
    }
