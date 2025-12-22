from typing import Dict, Any, List
import google.generativeai as genai
from app.core.config import settings
import base64
import json
import logging

class VisionAIService:
    @staticmethod
    def analyze_image(image_base64: str) -> Dict[str, Any]:
        """
        Analyze image using Gemini 2.0 Flash (Multimodal).
        """
        try:
            # Configure API
            api_key = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY
            if not api_key:
                print("⚠️ No Gemini/Google API Key found for Vision AI")
                return {
                    "visual_score": 0,
                    "feedback": ["API Key missing. Please configure GEMINI_API_KEY."],
                    "market_prediction": "Configuration Error"
                }

            genai.configure(api_key=api_key)
            # Use Gemini 2.0 Flash for stability and speed
            model = genai.GenerativeModel('gemini-2.0-flash')

            # Clean base64 string if needed (remove header if present)
            if "base64," in image_base64:
                image_base64 = image_base64.split("base64,")[1]

            # Decode base64 to bytes
            image_data = base64.b64decode(image_base64)
            
            prompt = """
            You are an expert social media strategist. Analyze this image for its potential as a social media post (Instagram/YouTube thumbnail).
            
            Provide:
            1. A visual score (0-100) based on composition, lighting, and engagement potential.
            2. 3 specific, actionable feedback points to improve it.
            3. A market prediction (High Potential, Medium Potential, Low Potential).
            
            Return ONLY raw JSON in this exact format (no markdown backticks):
            {
              "visual_score": number,
              "feedback": ["string", "string", "string"],
              "market_prediction": "string"
            }
            """

            # Generate content
            response = model.generate_content([
                {'mime_type': 'image/jpeg', 'data': image_data},
                prompt
            ])
            
            # Remove markdown if model includes it despite instructions
            text_response = response.text.strip()
            if text_response.startswith("```json"):
                text_response = text_response[7:-3]
            elif text_response.startswith("```"):
                text_response = text_response[3:-3]
            
            return json.loads(text_response)

        except Exception as e:
            logging.error(f"Vision AI Error: {e}")
            print(f"❌ Vision AI Error: {e}")
            return {
                "visual_score": 0,
                "feedback": [
                    "Failed to analyze image.",
                    f"Error: {str(e)}",
                    "Please check your API key and connection."
                ],
                "market_prediction": "Analysis Failed"
            }
