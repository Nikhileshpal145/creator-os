
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

print("Verifying imports...")

try:
    from app.services.playwright_service import playwright_service
    print("✅ PlaywrightService imported")
except Exception as e:
    print(f"❌ PlaywrightService failed: {e}")

try:
    from app.services.agent_service import CreatorAgent
    print("✅ CreatorAgent (with Ollama/Groq) imported")
except Exception as e:
    print(f"❌ CreatorAgent failed: {e}")

try:
    from app.api.v1.scrape import router as scrape_router
    print("✅ Scrape Router imported")
except Exception as e:
    print(f"❌ Scrape Router failed: {e}")

print("Verification complete.")
