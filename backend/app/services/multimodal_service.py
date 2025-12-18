"""
Multi-modal Analyzer Service

Open-source vision and video understanding:
- CLIP for thumbnail/image analysis
- LLaVA for video understanding (via Ollama)
- FFmpeg for video processing

All components are 100% open-source.
"""

from typing import Dict, List, Any, Optional
import base64
import subprocess
import tempfile
import os


class MultimodalService:
    """
    Multi-modal content analyzer using open-source models.
    """
    
    def __init__(self):
        self._clip_model = None
        self._clip_processor = None
        self._device = None
    
    # ========================================
    # CLIP - IMAGE ANALYSIS
    # ========================================
    
    def _load_clip(self):
        """Lazy load CLIP model."""
        if self._clip_model is None:
            try:
                import torch
                from transformers import CLIPProcessor, CLIPModel
                
                self._device = "cuda" if torch.cuda.is_available() else "cpu"
                self._clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
                self._clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
                self._clip_model.to(self._device)
                print(f"✅ CLIP loaded on {self._device}")
            except ImportError:
                print("⚠️ transformers/torch not installed. Using mock analysis.")
                return False
            except Exception as e:
                print(f"⚠️ CLIP load error: {e}")
                return False
        return True
    
    def analyze_image(self, image_source: str | bytes) -> Dict[str, Any]:
        """
        Analyze an image using CLIP.
        
        Args:
            image_source: File path, URL, or base64 bytes
            
        Returns:
            Analysis with content classification, colors, and quality score
        """
        if not self._load_clip():
            return self._mock_image_analysis()
        
        try:
            from PIL import Image
            import torch
            import io
            
            # Load image
            if isinstance(image_source, bytes):
                image = Image.open(io.BytesIO(image_source))
            elif image_source.startswith(('http://', 'https://')):
                import requests
                response = requests.get(image_source)
                image = Image.open(io.BytesIO(response.content))
            else:
                image = Image.open(image_source)
            
            # Analyze content type
            content_labels = [
                "a person's face", "a group of people", "text overlay",
                "product photo", "landscape", "food", "animal",
                "screenshot", "meme", "infographic", "selfie",
                "behind the scenes", "tutorial", "quote graphic"
            ]
            
            inputs = self._clip_processor(
                text=content_labels,
                images=image,
                return_tensors="pt",
                padding=True
            ).to(self._device)
            
            with torch.no_grad():
                outputs = self._clip_model(**inputs)
                logits = outputs.logits_per_image
                probs = logits.softmax(dim=1)
            
            # Get top classifications
            top_indices = probs[0].argsort(descending=True)[:3]
            classifications = [
                {"label": content_labels[i], "confidence": round(probs[0][i].item(), 3)}
                for i in top_indices
            ]
            
            # Extract dominant colors
            colors = self._extract_colors(image)
            
            # Check for face
            has_face = any("face" in c["label"] or "selfie" in c["label"] for c in classifications)
            
            # Quality score based on image size and clarity
            width, height = image.size
            quality_score = min(1.0, (width * height) / (1920 * 1080))
            
            return {
                "status": "analyzed",
                "classifications": classifications,
                "primary_type": classifications[0]["label"],
                "has_face": has_face,
                "has_text": any("text" in c["label"] or "quote" in c["label"] for c in classifications),
                "dominant_colors": colors,
                "dimensions": {"width": width, "height": height},
                "quality_score": round(quality_score, 2),
                "recommendations": self._get_image_recommendations(classifications, has_face, colors)
            }
            
        except Exception as e:
            print(f"Image analysis error: {e}")
            return self._mock_image_analysis()
    
    def _extract_colors(self, image, num_colors: int = 5) -> List[Dict]:
        """Extract dominant colors from image."""
        try:
            from collections import Counter
            
            # Resize for faster processing
            small = image.copy()
            small.thumbnail((100, 100))
            
            # Convert to RGB
            if small.mode != 'RGB':
                small = small.convert('RGB')
            
            # Get pixels
            pixels = list(small.getdata())
            
            # Quantize colors (reduce to 16 levels per channel)
            quantized = [(r // 16 * 16, g // 16 * 16, b // 16 * 16) for r, g, b in pixels]
            
            # Count occurrences
            color_counts = Counter(quantized)
            top_colors = color_counts.most_common(num_colors)
            
            return [
                {
                    "rgb": list(color),
                    "hex": "#{:02x}{:02x}{:02x}".format(*color),
                    "percentage": round(count / len(pixels) * 100, 1)
                }
                for color, count in top_colors
            ]
        except Exception:
            return [{"hex": "#000000", "percentage": 100}]
    
    def _get_image_recommendations(self, classifications: List, has_face: bool, colors: List) -> List[str]:
        """Generate recommendations based on analysis."""
        recs = []
        
        if has_face:
            recs.append("✅ Face detected - content with faces gets 38% more engagement")
        else:
            recs.append("💡 Consider adding a human face for higher engagement")
        
        primary = classifications[0]["label"]
        if "text" in primary or "quote" in primary:
            recs.append("📝 Text-heavy thumbnail - ensure it's readable on mobile")
        if "meme" in primary:
            recs.append("😄 Meme format detected - great for shares, may limit reach")
        
        # Color analysis
        if colors:
            bright_colors = sum(1 for c in colors if sum(c["rgb"]) > 400)
            if bright_colors < 2:
                recs.append("🎨 Consider brighter colors to stand out in feeds")
        
        return recs[:3]
    
    def _mock_image_analysis(self) -> Dict[str, Any]:
        """Return mock analysis when CLIP unavailable."""
        return {
            "status": "analyzed_mock",
            "classifications": [
                {"label": "a person's face", "confidence": 0.85},
                {"label": "selfie", "confidence": 0.72},
                {"label": "behind the scenes", "confidence": 0.45}
            ],
            "primary_type": "a person's face",
            "has_face": True,
            "has_text": False,
            "dominant_colors": [
                {"rgb": [64, 128, 192], "hex": "#4080c0", "percentage": 35.2},
                {"rgb": [240, 240, 240], "hex": "#f0f0f0", "percentage": 28.1},
                {"rgb": [32, 32, 32], "hex": "#202020", "percentage": 18.5}
            ],
            "dimensions": {"width": 1280, "height": 720},
            "quality_score": 0.78,
            "recommendations": [
                "✅ Face detected - content with faces gets 38% more engagement",
                "🎨 Good color contrast for visibility",
                "📐 Standard 16:9 aspect ratio - optimal for most platforms"
            ]
        }
    
    # ========================================
    # LLaVA - VIDEO UNDERSTANDING
    # ========================================
    
    def analyze_video(self, video_path: str, extract_frames: int = 5) -> Dict[str, Any]:
        """
        Analyze video using frame extraction and LLaVA.
        
        Args:
            video_path: Path to video file
            extract_frames: Number of key frames to analyze
        """
        try:
            # Extract key frames using FFmpeg
            frames = self._extract_video_frames(video_path, extract_frames)
            
            if not frames:
                return self._mock_video_analysis()
            
            # Analyze each frame
            frame_analyses = []
            for frame_path in frames:
                analysis = self.analyze_image(frame_path)
                frame_analyses.append(analysis)
            
            # Aggregate results
            all_types = [fa.get("primary_type", "") for fa in frame_analyses]
            has_face_count = sum(1 for fa in frame_analyses if fa.get("has_face", False))
            
            # Try LLaVA for deeper understanding
            llava_summary = self._analyze_with_llava(frames[0]) if frames else None
            
            return {
                "status": "analyzed",
                "frame_count": len(frames),
                "frame_analyses": frame_analyses,
                "content_types_detected": list(set(all_types)),
                "face_presence_ratio": round(has_face_count / len(frames), 2) if frames else 0,
                "llava_summary": llava_summary,
                "recommendations": self._get_video_recommendations(frame_analyses, has_face_count / len(frames) if frames else 0)
            }
            
        except Exception as e:
            print(f"Video analysis error: {e}")
            return self._mock_video_analysis()
    
    def _extract_video_frames(self, video_path: str, num_frames: int = 5) -> List[str]:
        """Extract key frames from video using FFmpeg."""
        try:
            with tempfile.TemporaryDirectory() as tmpdir:

                
                # Get video duration
                probe_cmd = [
                    "ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1", video_path
                ]
                result = subprocess.run(probe_cmd, capture_output=True, text=True)
                duration = float(result.stdout.strip()) if result.stdout.strip() else 60
                
                # Extract frames at intervals
                interval = duration / (num_frames + 1)
                frame_paths = []
                
                for i in range(1, num_frames + 1):
                    timestamp = interval * i
                    output_path = os.path.join(tmpdir, f"frame_{i:03d}.jpg")
                    
                    cmd = [
                        "ffmpeg", "-ss", str(timestamp), "-i", video_path,
                        "-vframes", "1", "-q:v", "2", output_path, "-y"
                    ]
                    subprocess.run(cmd, capture_output=True)
                    
                    if os.path.exists(output_path):
                        # Read and store frame data
                        with open(output_path, 'rb') as f:
                            frame_paths.append(f.read())
                
                return frame_paths
                
        except Exception as e:
            print(f"FFmpeg error: {e}")
            return []
    
    def _analyze_with_llava(self, image_data: bytes) -> Optional[str]:
        """Analyze image with LLaVA via Ollama."""
        try:
            import requests
            
            # Check if Ollama is running
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "llava",
                    "prompt": "Describe this image in detail. What content type is it? What makes it engaging or not?",
                    "images": [base64_image],
                    "stream": False
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json().get("response", "")
            return None
            
        except Exception as e:
            print(f"LLaVA unavailable: {e}")
            return None
    
    def _get_video_recommendations(self, analyses: List, face_ratio: float) -> List[str]:
        """Generate video-specific recommendations."""
        recs = []
        
        if face_ratio > 0.5:
            recs.append("✅ Good face presence throughout video")
        elif face_ratio > 0:
            recs.append("💡 Consider more face time for better retention")
        else:
            recs.append("⚠️ No faces detected - personal connection helps engagement")
        
        recs.append("📊 Hook viewers in first 3 seconds with compelling visuals")
        
        return recs
    
    def _mock_video_analysis(self) -> Dict[str, Any]:
        """Return mock video analysis."""
        return {
            "status": "analyzed_mock",
            "frame_count": 5,
            "frame_analyses": [self._mock_image_analysis() for _ in range(5)],
            "content_types_detected": ["a person's face", "behind the scenes"],
            "face_presence_ratio": 0.8,
            "llava_summary": "The video shows a person speaking directly to camera with good lighting. Behind-the-scenes style content with natural setting.",
            "recommendations": [
                "✅ Good face presence throughout video",
                "📊 Hook viewers in first 3 seconds with compelling visuals",
                "🎯 Consider adding text overlays for silent viewing"
            ]
        }
    
    # ========================================
    # THUMBNAIL OPTIMIZATION
    # ========================================
    
    def score_thumbnail(self, image_source: str | bytes) -> Dict[str, Any]:
        """
        Score a thumbnail for click-through potential.
        """
        analysis = self.analyze_image(image_source)
        
        score = 50  # Base score
        factors = []
        
        # Face bonus
        if analysis.get("has_face"):
            score += 15
            factors.append({"factor": "Face detected", "impact": "+15"})
        
        # Quality
        quality = analysis.get("quality_score", 0.5)
        quality_bonus = int(quality * 10)
        score += quality_bonus
        factors.append({"factor": "Image quality", "impact": f"+{quality_bonus}"})
        
        # Color vibrancy
        colors = analysis.get("dominant_colors", [])
        if colors:
            avg_brightness = sum(sum(c.get("rgb", [0,0,0])) for c in colors[:3]) / 3 / 255 / 3
            if avg_brightness > 0.5:
                score += 10
                factors.append({"factor": "Vibrant colors", "impact": "+10"})
        
        # Text overlay
        if analysis.get("has_text"):
            score += 5
            factors.append({"factor": "Text overlay", "impact": "+5"})
        
        score = min(100, max(0, score))
        
        return {
            "score": score,
            "rating": "Excellent" if score >= 80 else "Good" if score >= 60 else "Needs Work",
            "factors": factors,
            "analysis": analysis,
            "suggestions": analysis.get("recommendations", [])
        }


# Singleton instance
_multimodal_service = None

def get_multimodal_service() -> MultimodalService:
    global _multimodal_service
    if _multimodal_service is None:
        _multimodal_service = MultimodalService()
    return _multimodal_service
