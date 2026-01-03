"""Simple LLM wrapper for agents."""
import os
import google.generativeai as genai
from app.core.config import settings
from typing import Optional

# Configuration (mirrors NLQueryService logic simplified)
GEMINI_KEY = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY or os.getenv("GEMINI_API_KEY")
OPENAI_KEY = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")

async def call_llm(prompt: str) -> str:
    """Arg‑less async call to the best available LLM."""
    # 1. Try Gemini
    if GEMINI_KEY:
        try:
            genai.configure(api_key=GEMINI_KEY)
            model = genai.GenerativeModel('gemini-2.0-flash')
            resp = model.generate_content(prompt)
            return resp.text
        except Exception as e:
            print(f"Gemini error: {e}")

    # 2. Try OpenAI
    if OPENAI_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_KEY)
            resp = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}]
            )
            return resp.choices[0].message.content
        except Exception as e:
            print(f"OpenAI error: {e}")

    # 3. Try Hugging Face via Subprocess (Robust Isolation)
    HF_KEY = settings.HF_TOKEN or os.getenv("HF_TOKEN")
    if HF_KEY:
        try:
            import asyncio
            import sys
            
            # Path to worker script
            worker_path = os.path.join(os.path.dirname(__file__), "hf_worker.py")
            
            # Execute subprocess to avoid asyncio/generator conflicts
            proc = await asyncio.create_subprocess_exec(
                sys.executable,
                worker_path,
                "--mode", "text",
                "--prompt", prompt,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await proc.communicate()
            
            if proc.returncode == 0:
                 return stdout.decode().strip()
            else:
                 error_msg = stderr.decode().strip()
                 print(f"HF Worker Error: {error_msg}")
                 return f"AI Error: {error_msg}"

        except Exception as e:
            print(f"HuggingFace error: {e}")
            return f"AI Connection Error: {str(e)}"

    return "AI Unavailable: Please check your HF_TOKEN in .env file."


async def analyze_image(image_bytes: bytes) -> dict:
    """Analyze image using HF Vision Model via Subprocess."""
    HF_KEY = settings.HF_TOKEN or os.getenv("HF_TOKEN")
    if not HF_KEY:
        return {"error": "No HF_TOKEN"}

    import tempfile
    
    # Write image to temp file for worker
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        import asyncio
        import sys
        
        worker_path = os.path.join(os.path.dirname(__file__), "hf_worker.py")
        
        proc = await asyncio.create_subprocess_exec(
            sys.executable,
            worker_path,
            "--mode", "vision",
            "--image_path", tmp_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await proc.communicate()
        
        if proc.returncode == 0:
            caption = stdout.decode().strip()
            return {
                "caption": caption,
                "signals": ["ai_analyzed"],
                "risk": "low"
            }
        else:
            error_msg = stderr.decode().strip()
            print(f"HF Worker Error: {error_msg}")
            return {"error": error_msg, "signals": ["local_fallback_needed"]}

    except Exception as e:
        print(f"Vision AI Error: {e}")
        return {"error": str(e), "signals": ["local_fallback_needed"]}
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
